export interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  message: string;
  source: string;
  component?: string;
  context?: Record<string, any>;
}

export interface InstallationLog {
  applicationName: string;
  version?: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  completionTime?: Date;
  errorCode?: string;
  errorMessage?: string;
  installLocation?: string;
  metadata?: Record<string, any>;
}

export interface ConfigurationLog {
  configType: string;
  component: string;
  status: 'pending' | 'applied' | 'failed';
  appliedAt?: Date;
  settings: Record<string, any>;
  errorMessage?: string;
}

export interface EventLog {
  eventId: number;
  providerName: string;
  channel: string;
  level: string;
  timestamp: Date;
  message: string;
  taskCategory?: string;
  keywords?: string[];
  metadata?: Record<string, any>;
}

export interface ParserResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  priority: 'high' | 'medium' | 'low';
}
