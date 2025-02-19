export interface ProcessingTask {
  id: string;
  deployment_id: string;
  file_path: string;
  file_type: 'event' | 'trace' | 'installation' | 'configuration';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProcessingResult {
  success: boolean;
  data?: LogEntry[];
  error?: string;
}

export interface LogEntry {
  id?: string;
  deployment_id: string;
  file_path: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
  error?: boolean;
  created_at?: Date;
}

export interface DeploymentSummary {
  id: string;
  machine_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  start_time: Date;
  end_time?: Date;
  error_count: number;
  warning_count: number;
  info_count: number;
  created_at: Date;
  updated_at: Date;
}
