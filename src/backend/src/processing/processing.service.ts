import { Injectable, OnModuleInit } from '@nestjs/common';
import { ProcessingQueue } from '../../lib/processing/ProcessingQueue';
import { DatabaseService } from '../database/database.service';
import { ProcessingTask, ProcessingResult } from '../interfaces';
import {
  InstallationLogParser,
  EventLogParser,
  ConfigurationLogParser,
  ETLParser
} from '../../lib/parsers';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class ProcessingService implements OnModuleInit {
  private queue: ProcessingQueue;
  private parsers: {
    installation: InstallationLogParser;
    event: EventLogParser;
    configuration: ConfigurationLogParser;
    trace: ETLParser;
  };

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    // Initialize processing queue
    this.queue = new ProcessingQueue(5);
    
    // Initialize parsers
    this.parsers = {
      installation: new InstallationLogParser(),
      event: new EventLogParser(),
      configuration: new ConfigurationLogParser(),
      trace: new ETLParser(),
    };

    // Start processing queue
    this.startProcessing();
  }

  async createTask(task: Omit<ProcessingTask, 'id'>): Promise<ProcessingTask> {
    // Generate task ID
    const taskId = crypto.randomUUID();
    const fullTask: ProcessingTask = {
      ...task,
      id: taskId,
      status: 'pending',
      created_at: new Date(),
    };

    // Save task to database
    await this.db.saveProcessingTask(fullTask);

    // Add to processing queue
    this.queue.enqueue(fullTask);

    return fullTask;
  }

  private startProcessing() {
    setInterval(async () => {
      const task = this.queue.dequeue();
      if (!task) return;

      try {
        // Update task status
        await this.db.updateTaskStatus(task.id, 'processing');

        // Process the task
        const result = await this.processTask(task);

        // Handle result
        if (result.success) {
          await this.handleSuccess(task, result);
        } else {
          await this.handleError(task, result.error);
        }
      } catch (error) {
        await this.handleError(task, error.message);
      }
    }, 100); // Check queue every 100ms
  }

  private async processTask(task: ProcessingTask): Promise<ProcessingResult> {
    try {
      // Read file content
      const content = await fs.readFile(task.filePath);

      // Get appropriate parser
      const parser = this.parsers[task.fileType];
      if (!parser) {
        throw new Error(`No parser available for file type: ${task.fileType}`);
      }

      // Parse content
      const result = await parser.parse(content);

      // Save parsed entries to database
      if (result.success && result.data) {
        for (const entry of result.data) {
          await this.db.insertLogEntry({
            ...entry,
            deployment_id: task.deploymentId,
            file_path: task.filePath,
          });
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: null,
      };
    }
  }

  private async handleSuccess(task: ProcessingTask, result: ProcessingResult) {
    await this.db.updateTaskStatus(task.id, 'completed');
    
    // Clean up temporary file
    try {
      await fs.unlink(task.filePath);
    } catch (error) {
      console.error(`Failed to delete temporary file ${task.filePath}:`, error);
    }

    // Update deployment status if needed
    if (this.shouldUpdateDeploymentStatus(task)) {
      await this.updateDeploymentStatus(task.deploymentId);
    }
  }

  private async handleError(task: ProcessingTask, error: string) {
    await this.db.updateTaskStatus(task.id, 'failed', error);

    // Clean up temporary file
    try {
      await fs.unlink(task.filePath);
    } catch (error) {
      console.error(`Failed to delete temporary file ${task.filePath}:`, error);
    }
  }

  private shouldUpdateDeploymentStatus(task: ProcessingTask): boolean {
    // Update deployment status when processing high-priority installation logs
    return task.priority === 'high' && task.fileType === 'installation';
  }

  private async updateDeploymentStatus(deploymentId: string) {
    const errors = await this.db.getErrorsByDeploymentId(deploymentId);
    const status = errors.length > 0 ? 'failed' : 'completed';
    await this.db.updateDeploymentStatus(deploymentId, status);
  }

  getMetrics() {
    return this.queue.getMetrics();
  }
}
