import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { ProcessingQueue } from '../../lib/processing/ProcessingQueue';
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
  private readonly supabase;
  private readonly logger = new Logger(ProcessingService.name);
  private queue: ProcessingQueue;
  private parsers: {
    installation: InstallationLogParser;
    event: EventLogParser;
    configuration: ConfigurationLogParser;
    trace: ETLParser;
  };

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY')
    );
  }

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
    const { error: saveError } = await this.supabase
      .from('processing_tasks')
      .insert(fullTask);

    if (saveError) throw saveError;

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
        const { error: updateError } = await this.supabase
          .from('processing_tasks')
          .update({ status: 'processing' })
          .eq('id', task.id);

        if (updateError) throw updateError;

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
      const { data: file, error: fileError } = await this.supabase.storage
        .from('deployment-logs')
        .download(task.filePath);

      if (fileError) throw fileError;

      // Get appropriate parser
      const parser = this.parsers[task.fileType];
      if (!parser) {
        throw new Error(`No parser available for file type: ${task.fileType}`);
      }

      // Parse content
      const result = await parser.parse(file);

      // Save parsed entries to database
      if (result.success && result.data) {
        const { error: insertError } = await this.supabase
          .from('log_entries')
          .insert(
            result.data.map(entry => ({
              ...entry,
              deployment_id: task.deploymentId,
              file_path: task.filePath,
            }))
          );

        if (insertError) throw insertError;
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
    const { error: updateError } = await this.supabase
      .from('processing_tasks')
      .update({ status: 'completed' })
      .eq('id', task.id);

    if (updateError) throw updateError;

    // Clean up temporary file
    try {
      const { error: deleteError } = await this.supabase.storage
        .from('deployment-logs')
        .remove([task.filePath]);

      if (deleteError) throw deleteError;
    } catch (error) {
      this.logger.error(`Failed to delete temporary file ${task.filePath}:`, error);
    }

    // Update deployment status if needed
    if (this.shouldUpdateDeploymentStatus(task)) {
      await this.updateDeploymentStatus(task.deploymentId);
    }
  }

  private async handleError(task: ProcessingTask, error: string) {
    const { error: updateError } = await this.supabase
      .from('processing_tasks')
      .update({ status: 'failed', error })
      .eq('id', task.id);

    if (updateError) throw updateError;

    // Clean up temporary file
    try {
      const { error: deleteError } = await this.supabase.storage
        .from('deployment-logs')
        .remove([task.filePath]);

      if (deleteError) throw deleteError;
    } catch (error) {
      this.logger.error(`Failed to delete temporary file ${task.filePath}:`, error);
    }
  }

  private shouldUpdateDeploymentStatus(task: ProcessingTask): boolean {
    // Update deployment status when processing high-priority installation logs
    return task.priority === 'high' && task.fileType === 'installation';
  }

  private async updateDeploymentStatus(deploymentId: string) {
    const { data: errors, error: errorsError } = await this.supabase
      .from('log_entries')
      .select('id')
      .eq('deployment_id', deploymentId)
      .eq('error', true);

    if (errorsError) throw errorsError;

    const status = errors.length > 0 ? 'failed' : 'completed';
    const { error: updateError } = await this.supabase
      .from('deployments')
      .update({ status })
      .eq('id', deploymentId);

    if (updateError) throw updateError;
  }

  async queueDeploymentForProcessing(deploymentId: string, machineName: string) {
    try {
      // Get list of files from storage
      const { data: files, error: listError } = await this.supabase.storage
        .from('deployment-logs')
        .list(machineName);

      if (listError) throw listError;

      // Create processing tasks for each file
      const { error: tasksError } = await this.supabase
        .from('processing_tasks')
        .insert(
          files.map(file => ({
            deployment_id: deploymentId,
            file_path: `${machineName}/${file.name}`,
            status: 'pending',
            file_type: this.determineFileType(file.name),
            priority: this.determinePriority(file.name),
          }))
        );

      if (tasksError) throw tasksError;

      // Update deployment status
      const { error: updateError } = await this.supabase
        .from('deployments')
        .update({ status: 'processing' })
        .eq('id', deploymentId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      this.logger.error(`Error queueing deployment for processing: ${error.message}`, error.stack);
      throw error;
    }
  }

  private determineFileType(filename: string): string {
    if (filename.endsWith('.evtx')) return 'event';
    if (filename.endsWith('.etl')) return 'trace';
    if (filename.startsWith('Install_')) return 'installation';
    return 'configuration';
  }

  private determinePriority(filename: string): 'high' | 'medium' | 'low' {
    if (filename.includes('error') || filename.includes('critical')) return 'high';
    if (filename.startsWith('Install_')) return 'medium';
    return 'low';
  }

  getMetrics() {
    return this.queue.getMetrics();
  }
}
