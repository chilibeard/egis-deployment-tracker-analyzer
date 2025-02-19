import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ProcessingService } from '../processing/processing.service';
import { LogEntry, TimelineEvent } from './interfaces';

@Injectable()
export class LogsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly processingService: ProcessingService,
  ) {}

  async processLogs(
    files: Express.Multer.File[],
    deploymentId: string,
  ): Promise<{ taskIds: string[] }> {
    const tasks = await Promise.all(
      files.map(async (file) => {
        // Save file to temporary storage
        const filePath = await this.saveToTemp(file);
        
        // Create processing task
        return this.processingService.createTask({
          filePath,
          deploymentId,
          fileType: this.determineFileType(file.originalname),
          priority: this.determinePriority(file.originalname),
          fileSize: file.size,
        });
      }),
    );

    return { taskIds: tasks.map(t => t.id) };
  }

  async getLogsByDeploymentId(deploymentId: string): Promise<LogEntry[]> {
    return this.db.getLogsByDeploymentId(deploymentId);
  }

  async getErrorsByDeploymentId(deploymentId: string): Promise<LogEntry[]> {
    return this.db.getErrorsByDeploymentId(deploymentId);
  }

  async getDeploymentTimeline(deploymentId: string): Promise<TimelineEvent[]> {
    const logs = await this.db.getLogsByDeploymentId(deploymentId);
    return this.buildTimeline(logs);
  }

  private async saveToTemp(file: Express.Multer.File): Promise<string> {
    // Implementation to save file to temporary storage
    // This could be local filesystem or cloud storage
    return '';
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

  private buildTimeline(logs: LogEntry[]): TimelineEvent[] {
    return logs
      .map(log => ({
        timestamp: log.timestamp,
        event: log.message,
        type: log.level,
        source: log.source,
        metadata: log.metadata,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}
