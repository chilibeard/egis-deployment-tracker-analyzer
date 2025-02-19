import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { LogEntry, ProcessingTask, FileRelationship } from '../interfaces';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_KEY'),
    );
  }

  // Deployments
  async createDeployment(deviceId: string) {
    const { data, error } = await this.supabase
      .from('deployments')
      .insert({
        device_id: deviceId,
        start_time: new Date(),
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDeploymentStatus(deploymentId: string, status: string) {
    const { error } = await this.supabase
      .from('deployments')
      .update({ status, end_time: status === 'completed' ? new Date() : null })
      .eq('id', deploymentId);

    if (error) throw error;
  }

  // Logs
  async insertLogEntry(entry: LogEntry) {
    const { error } = await this.supabase
      .from('log_entries')
      .insert(entry);

    if (error) throw error;
  }

  async getLogsByDeploymentId(deploymentId: string): Promise<LogEntry[]> {
    const { data, error } = await this.supabase
      .from('log_entries')
      .select('*')
      .eq('deployment_id', deploymentId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  }

  async getErrorsByDeploymentId(deploymentId: string): Promise<LogEntry[]> {
    const { data, error } = await this.supabase
      .from('log_entries')
      .select('*')
      .eq('deployment_id', deploymentId)
      .eq('level', 'error')
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Processing Tasks
  async saveProcessingTask(task: ProcessingTask) {
    const { error } = await this.supabase
      .from('processing_tasks')
      .insert(task);

    if (error) throw error;
  }

  async updateTaskStatus(taskId: string, status: string, error?: string) {
    const { data, error: updateError } = await this.supabase
      .from('processing_tasks')
      .update({
        status,
        error,
        completed_at: new Date(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (updateError) throw updateError;
    return data;
  }

  // File Relationships
  async saveFileRelationship(relationship: FileRelationship) {
    const { error } = await this.supabase
      .from('file_relationships')
      .insert(relationship);

    if (error) throw error;
  }

  async getRelatedFiles(filePath: string): Promise<FileRelationship[]> {
    const { data, error } = await this.supabase
      .from('file_relationships')
      .select('*')
      .or(`source_file.eq.${filePath},related_file.eq.${filePath}`);

    if (error) throw error;
    return data;
  }
}
