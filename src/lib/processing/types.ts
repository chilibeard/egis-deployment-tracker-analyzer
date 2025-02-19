import { LogEntry, InstallationLog, ConfigurationLog, EventLog } from '../parsers';

export type ProcessingPriority = 'high' | 'medium' | 'low';

export interface ProcessingTask {
  id: string;
  deploymentId: string;
  phaseId?: string;
  filePath: string;
  fileType: 'installation' | 'event' | 'configuration' | 'general';
  priority: ProcessingPriority;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ProcessingResult {
  taskId: string;
  success: boolean;
  data?: LogEntry | InstallationLog | ConfigurationLog | EventLog;
  error?: string;
}

export interface QueueMetrics {
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  processingCount: number;
  failedCount: number;
  averageProcessingTime: number;
}
