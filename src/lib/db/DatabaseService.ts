import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LogEntry, InstallationLog, ConfigurationLog, EventLog } from '../parsers';
import { ProcessingTask } from '../processing/types';

export class DatabaseService {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  // Deployment Management
  async createDeployment(machineName: string): Promise<string> {
    const { data, error } = await this.client
      .from('deployments')
      .insert({
        machine_name: machineName,
        status: 'initializing',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateDeploymentStatus(deploymentId: string, status: string): Promise<void> {
    const { error } = await this.client
      .from('deployments')
      .update({
        status,
        last_update_time: new Date().toISOString(),
      })
      .eq('id', deploymentId);

    if (error) throw error;
  }

  // Phase Management
  async createPhase(deploymentId: string, phaseName: string): Promise<string> {
    const { data, error } = await this.client
      .from('deployment_phases')
      .insert({
        deployment_id: deploymentId,
        phase_name: phaseName,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updatePhaseStatus(phaseId: string, status: string): Promise<void> {
    const { error } = await this.client
      .from('deployment_phases')
      .update({
        status,
        completion_time: status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', phaseId);

    if (error) throw error;
  }

  // Log Entry Management
  async insertLogEntry(entry: LogEntry, deploymentId: string, phaseId?: string): Promise<void> {
    const { error } = await this.client
      .from('log_entries')
      .insert({
        deployment_id: deploymentId,
        phase_id: phaseId,
        timestamp: entry.timestamp.toISOString(),
        log_level: entry.level,
        source_file: entry.source,
        message: entry.message,
        component: entry.component,
        context: entry.context,
      });

    if (error) throw error;
  }

  // Installation Log Management
  async insertInstallationLog(log: InstallationLog, deploymentId: string, phaseId: string): Promise<void> {
    const { error } = await this.client
      .from('installation_logs')
      .insert({
        deployment_id: deploymentId,
        phase_id: phaseId,
        application_name: log.applicationName,
        version: log.version,
        status: log.status,
        start_time: log.startTime.toISOString(),
        completion_time: log.completionTime?.toISOString(),
        error_code: log.errorCode,
        error_message: log.errorMessage,
        install_location: log.installLocation,
        metadata: log.metadata,
      });

    if (error) throw error;
  }

  // Configuration Log Management
  async insertConfigurationLog(log: ConfigurationLog, deploymentId: string, phaseId: string): Promise<void> {
    const { error } = await this.client
      .from('configuration_logs')
      .insert({
        deployment_id: deploymentId,
        phase_id: phaseId,
        config_type: log.configType,
        component: log.component,
        status: log.status,
        applied_at: log.appliedAt?.toISOString(),
        settings: log.settings,
        error_message: log.errorMessage,
      });

    if (error) throw error;
  }

  // Event Log Management
  async insertEventLog(log: EventLog, deploymentId: string, phaseId: string): Promise<void> {
    const { error } = await this.client
      .from('event_logs')
      .insert({
        deployment_id: deploymentId,
        phase_id: phaseId,
        event_id: log.eventId,
        provider_name: log.providerName,
        channel: log.channel,
        level: log.level,
        timestamp: log.timestamp.toISOString(),
        message: log.message,
        task_category: log.taskCategory,
        keywords: log.keywords,
        metadata: log.metadata,
      });

    if (error) throw error;
  }

  // Error Tracking
  async trackError(
    deploymentId: string,
    phaseId: string | null,
    errorType: string,
    source: string,
    message: string,
    stackTrace?: string
  ): Promise<void> {
    const { error } = await this.client
      .from('error_tracking')
      .insert({
        deployment_id: deploymentId,
        phase_id: phaseId,
        error_type: errorType,
        source,
        message,
        stack_trace: stackTrace,
        status: 'new',
      });

    if (error) throw error;
  }

  // Processing Task Management
  async saveProcessingTask(task: ProcessingTask): Promise<void> {
    const { error } = await this.client
      .from('processing_tasks')
      .insert({
        id: task.id,
        deployment_id: task.deploymentId,
        phase_id: task.phaseId,
        file_path: task.filePath,
        file_type: task.fileType,
        priority: task.priority,
        status: task.status,
        created_at: task.createdAt.toISOString(),
        started_at: task.startedAt?.toISOString(),
        completed_at: task.completedAt?.toISOString(),
        error: task.error,
      });

    if (error) throw error;
  }

  // Realtime Subscriptions
  subscribeToDeploymentUpdates(deploymentId: string, callback: (payload: any) => void): () => void {
    const subscription = this.client
      .channel(`deployment-${deploymentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deployments',
          filter: `id=eq.${deploymentId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}
