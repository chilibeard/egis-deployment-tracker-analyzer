export type DeploymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DeploymentSummary {
  id: string;
  machine_name: string;
  status: DeploymentStatus;
  start_time: string;
  end_time?: string;
  error_count: number;
  warning_count: number;
  info_count: number;
  created_at: string;
  updated_at: string;
}

export interface LogEntry {
  id: string;
  deployment_id: string;
  file_path: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  source: string;
  message: string;
  metadata?: Record<string, any>;
  error?: boolean;
  created_at: string;
}
