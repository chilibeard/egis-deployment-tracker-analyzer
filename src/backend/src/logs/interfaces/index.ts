export interface LogEntry {
  id?: string;
  deployment_id: string;
  timestamp: Date;
  level: string;
  message: string;
  source: string;
  file_path: string;
  metadata?: Record<string, any>;
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  type: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface ProcessingTask {
  id: string;
  deploymentId: string;
  filePath: string;
  fileType: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileSize: number;
  created_at: Date;
  completed_at?: Date;
  error?: string;
}

export interface FileRelationship {
  sourceFile: string;
  relatedFile: string;
  relationType: string;
  deploymentId: string;
  metadata?: Record<string, any>;
}
