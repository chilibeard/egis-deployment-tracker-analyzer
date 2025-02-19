import { ProcessingTask, QueueMetrics, TaskPriority } from './types';

export class ProcessingQueue {
  private queues: Map<TaskPriority, ProcessingTask[]> = new Map();
  private inProgress: Set<string> = new Set();
  private completed: Map<string, boolean> = new Map();
  private errors: Map<string, string> = new Map();
  private batchSizes: Map<TaskPriority, number>;
  private processingIntervals: Map<TaskPriority, number>;

  constructor(private maxConcurrent: number = 5) {
    // Initialize priority queues
    this.queues.set('high', []);
    this.queues.set('medium', []);
    this.queues.set('low', []);

    // Configure batch sizes for different priorities
    this.batchSizes = new Map([
      ['high', 1],        // Process immediately
      ['medium', 5],      // Process in small batches
      ['low', 10]         // Process in larger batches
    ]);

    // Configure processing intervals (in milliseconds)
    this.processingIntervals = new Map([
      ['high', 0],        // Process immediately
      ['medium', 300000], // Every 5 minutes
      ['low', 600000]     // Every 10 minutes
    ]);
  }

  public enqueue(task: ProcessingTask): void {
    const queue = this.queues.get(task.priority || 'medium');
    if (queue) {
      // Check for duplicate tasks
      const isDuplicate = queue.some(t => 
        t.filePath === task.filePath && 
        t.deploymentId === task.deploymentId
      );
      
      if (!isDuplicate) {
        queue.push(task);
        this.optimizeQueue(task.priority || 'medium');
      }
    }
  }

  public dequeue(): ProcessingTask | null {
    if (this.inProgress.size >= this.maxConcurrent) {
      return null;
    }

    // Process queues in priority order
    for (const [priority, queue] of this.queues) {
      if (queue.length === 0) continue;

      const batchSize = this.batchSizes.get(priority) || 1;
      const tasks = queue.splice(0, batchSize);
      
      // For batch processing, return only the first task
      // The rest will be processed in parallel
      if (tasks.length > 0) {
        const task = tasks[0];
        this.inProgress.add(task.id);
        
        // Process remaining batch tasks asynchronously
        if (tasks.length > 1) {
          this.processBatch(tasks.slice(1));
        }
        
        return task;
      }
    }

    return null;
  }

  private async processBatch(tasks: ProcessingTask[]): Promise<void> {
    const promises = tasks.map(task => {
      this.inProgress.add(task.id);
      // Return a promise that resolves when the task is completed
      return new Promise<void>(resolve => {
        const interval = this.processingIntervals.get(task.priority || 'medium') || 0;
        setTimeout(() => {
          // Task processing logic here
          this.inProgress.delete(task.id);
          resolve();
        }, interval);
      });
    });

    await Promise.all(promises);
  }

  private optimizeQueue(priority: TaskPriority): void {
    const queue = this.queues.get(priority);
    if (!queue) return;

    // Sort by file size (smaller files first) and timestamp
    queue.sort((a, b) => {
      // Prioritize smaller files
      const sizeA = a.fileSize || 0;
      const sizeB = b.fileSize || 0;
      if (sizeA !== sizeB) {
        return sizeA - sizeB;
      }
      
      // Then by timestamp
      const timeA = a.timestamp?.getTime() || 0;
      const timeB = b.timestamp?.getTime() || 0;
      return timeB - timeA;
    });

    // Group similar tasks for batch processing
    const groupedTasks = new Map<string, ProcessingTask[]>();
    queue.forEach(task => {
      const key = `${task.fileType}_${task.deploymentId}`;
      const group = groupedTasks.get(key) || [];
      group.push(task);
      groupedTasks.set(key, group);
    });

    // Flatten grouped tasks back into queue
    this.queues.set(priority, Array.from(groupedTasks.values()).flat());
  }

  public completeTask(taskId: string, success: boolean, error?: string): void {
    this.inProgress.delete(taskId);
    this.completed.set(taskId, success);
    if (error) {
      this.errors.set(taskId, error);
    }
  }

  public getMetrics(): QueueMetrics {
    return {
      queued: {
        high: this.queues.get('high')?.length || 0,
        medium: this.queues.get('medium')?.length || 0,
        low: this.queues.get('low')?.length || 0
      },
      inProgress: this.inProgress.size,
      completed: this.completed.size,
      errors: this.errors.size,
      success: Array.from(this.completed.values()).filter(v => v).length
    };
  }
}
