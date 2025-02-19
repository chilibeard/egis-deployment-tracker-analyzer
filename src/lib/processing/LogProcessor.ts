import { ProcessingQueue } from './ProcessingQueue';
import { ProcessingTask, ProcessingResult } from './types';
import { DatabaseService } from '../db/DatabaseService';
import { ErrorHandler } from '../error/ErrorHandler';
import {
  InstallationLogParser,
  EventLogParser,
  ConfigurationLogParser,
} from '../parsers';
import { promises as fs } from 'fs';
import * as path from 'path';

export class LogProcessor {
  private queue: ProcessingQueue;
  private errorHandler: ErrorHandler;
  private parsers: {
    installation: InstallationLogParser;
    event: EventLogParser;
    configuration: ConfigurationLogParser;
  };
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private db: DatabaseService,
    private maxConcurrent: number = 5,
    private processIntervalMs: number = 1000
  ) {
    this.queue = new ProcessingQueue(maxConcurrent);
    this.errorHandler = new ErrorHandler(db);
    this.parsers = {
      installation: new InstallationLogParser(),
      event: new EventLogParser(),
      configuration: new ConfigurationLogParser(),
    };
  }

  public async addTask(task: ProcessingTask): Promise<void> {
    try {
      await this.errorHandler.retryWithBackoff(
        async () => {
          this.queue.enqueue(task);
          await this.db.saveProcessingTask(task);
        },
        {
          deploymentId: task.deploymentId,
          phaseId: task.phaseId,
          source: 'task_creation',
          component: 'queue'
        }
      );
    } catch (error) {
      await this.errorHandler.handleError(
        task.deploymentId,
        task.phaseId || null,
        error,
        { source: 'task_creation', component: 'queue' }
      );
      throw error;
    }
  }

  public start(): void {
    if (this.processingInterval) return;

    this.processingInterval = setInterval(async () => {
      await this.processNextTask();
    }, this.processIntervalMs);
  }

  public stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processNextTask(): Promise<void> {
    const task = this.queue.dequeue();
    if (!task) return;

    try {
      const result = await this.errorHandler.retryWithBackoff(
        () => this.processTask(task),
        {
          deploymentId: task.deploymentId,
          phaseId: task.phaseId,
          source: 'task_processing',
          component: task.fileType
        }
      );
      await this.handleProcessingResult(task, result);
    } catch (error) {
      await this.errorHandler.handleError(
        task.deploymentId,
        task.phaseId || null,
        error,
        {
          source: 'task_processing',
          component: task.fileType,
          operation: 'process'
        }
      );
      this.queue.completeTask(task.id, false, error.message);
    }
  }

  private async processTask(task: ProcessingTask): Promise<ProcessingResult> {
    const content = await fs.readFile(task.filePath, 'utf8');
    
    let parseResult;
    switch (task.fileType) {
      case 'installation':
        parseResult = this.parsers.installation.parse(content);
        break;
      case 'event':
        parseResult = this.parsers.event.parse(content);
        break;
      case 'configuration':
        parseResult = this.parsers.configuration.parse(content);
        break;
      default:
        throw new Error(`Unsupported file type: ${task.fileType}`);
    }

    return {
      taskId: task.id,
      success: parseResult.success,
      data: parseResult.data,
      error: parseResult.error,
    };
  }

  private async handleProcessingResult(
    task: ProcessingTask,
    result: ProcessingResult
  ): Promise<void> {
    try {
      if (result.success && result.data) {
        await this.errorHandler.retryWithBackoff(
          async () => {
            switch (task.fileType) {
              case 'installation':
                await this.db.insertInstallationLog(
                  result.data,
                  task.deploymentId,
                  task.phaseId!
                );
                break;
              case 'event':
                await this.db.insertEventLog(
                  result.data,
                  task.deploymentId,
                  task.phaseId!
                );
                break;
              case 'configuration':
                await this.db.insertConfigurationLog(
                  result.data,
                  task.deploymentId,
                  task.phaseId!
                );
                break;
            }

            // Update phase status if needed
            if (
              task.fileType === 'installation' &&
              result.data.status === 'completed'
            ) {
              await this.db.updatePhaseStatus(task.phaseId!, 'completed');
            }
          },
          {
            deploymentId: task.deploymentId,
            phaseId: task.phaseId,
            source: 'result_processing',
            component: task.fileType
          }
        );

        await this.trackFileRelationships(task);

        this.queue.completeTask(task.id, true);
      } else {
        const error = result.error || 'Unknown processing error';
        await this.errorHandler.handleError(
          task.deploymentId,
          task.phaseId || null,
          new Error(error),
          {
            source: 'result_processing',
            component: task.fileType,
            operation: 'save_result'
          }
        );
        this.queue.completeTask(task.id, false, error);
      }
    } catch (error) {
      await this.errorHandler.handleError(
        task.deploymentId,
        task.phaseId || null,
        error,
        {
          source: 'result_processing',
          component: task.fileType,
          operation: 'save_result'
        }
      );
      this.queue.completeTask(task.id, false, error.message);
    }
  }

  private async trackFileRelationships(task: ProcessingTask): Promise<void> {
    const fileName = path.basename(task.filePath);
    
    // Track installation log and script relationships
    if (fileName.startsWith('Install_')) {
      const softwareName = fileName.split('_')[1];
      const scriptPath = path.join(
        path.dirname(task.filePath),
        '../Scripts',
        softwareName
      );
      
      if (await fs.access(scriptPath).then(() => true).catch(() => false)) {
        await this.db.saveFileRelationship({
          sourceFile: task.filePath,
          relatedFile: scriptPath,
          relationType: 'installation_script',
          deploymentId: task.deploymentId
        });
      }
    }

    // Track diagnostic file relationships
    if (fileName.includes('DiagnosticLogCSP')) {
      const metadataFile = path.join(
        path.dirname(task.filePath),
        'diagnostic_metadata.json'
      );
      
      if (await fs.access(metadataFile).then(() => true).catch(() => false)) {
        await this.db.saveFileRelationship({
          sourceFile: task.filePath,
          relatedFile: metadataFile,
          relationType: 'diagnostic_metadata',
          deploymentId: task.deploymentId
        });
      }
    }

    // Track event log relationships
    if (fileName.endsWith('.evtx')) {
      const otherEvtxFiles = await fs.readdir(path.dirname(task.filePath));
      const relatedEvtxFiles = otherEvtxFiles
        .filter(f => f.endsWith('.evtx') && f !== fileName);

      for (const relatedFile of relatedEvtxFiles) {
        await this.db.saveFileRelationship({
          sourceFile: task.filePath,
          relatedFile: path.join(path.dirname(task.filePath), relatedFile),
          relationType: 'event_log_reference',
          deploymentId: task.deploymentId
        });
      }
    }
  }

  public getMetrics() {
    return {
      queue: this.queue.getMetrics(),
      errors: this.errorHandler.getErrorCorrelations()
    };
  }
}
