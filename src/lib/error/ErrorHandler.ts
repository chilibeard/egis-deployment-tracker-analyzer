import { DatabaseService } from '../db/DatabaseService';

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

interface ErrorCorrelation {
  errorType: string;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  relatedErrors: string[];
  affectedComponents: string[];
}

export class ErrorHandler {
  private errorCorrelations: Map<string, ErrorCorrelation> = new Map();
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000
  };

  constructor(private db: DatabaseService) {}

  async handleError(
    deploymentId: string,
    phaseId: string | null,
    error: Error,
    context: {
      source: string;
      component?: string;
      operation?: string;
    }
  ): Promise<void> {
    const errorType = this.categorizeError(error);
    
    // Update error correlations
    this.updateErrorCorrelation(errorType, context);

    // Track error in database
    await this.db.trackError(
      deploymentId,
      phaseId,
      errorType,
      context.source,
      error.message,
      error.stack
    );

    // Check if this error type requires immediate attention
    if (this.isHighPriorityError(errorType)) {
      await this.handleHighPriorityError(deploymentId, errorType, error);
    }
  }

  private categorizeError(error: Error): string {
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'network_error';
    }
    if (error.message.includes('permission') || error.message.includes('access denied')) {
      return 'permission_error';
    }
    if (error.message.includes('installation')) {
      return 'installation_error';
    }
    if (error.message.includes('configuration')) {
      return 'configuration_error';
    }
    return 'unknown_error';
  }

  private updateErrorCorrelation(errorType: string, context: { source: string; component?: string }) {
    const existing = this.errorCorrelations.get(errorType) || {
      errorType,
      frequency: 0,
      firstSeen: new Date(),
      lastSeen: new Date(),
      relatedErrors: [],
      affectedComponents: []
    };

    existing.frequency++;
    existing.lastSeen = new Date();
    
    if (context.component && !existing.affectedComponents.includes(context.component)) {
      existing.affectedComponents.push(context.component);
    }

    this.errorCorrelations.set(errorType, existing);
  }

  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: {
      deploymentId: string;
      phaseId?: string;
      source: string;
      component?: string;
    }
  ): Promise<T> {
    let attempt = 1;
    let lastError: Error;

    while (attempt <= this.retryConfig.maxAttempts) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs
        );

        // Log retry attempt
        await this.db.trackError(
          context.deploymentId,
          context.phaseId || null,
          'retry_attempt',
          context.source,
          `Attempt ${attempt} failed: ${error.message}`,
          error.stack
        );

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
        attempt++;
      }
    }

    // If all retries failed, handle the final error
    await this.handleError(
      context.deploymentId,
      context.phaseId || null,
      lastError!,
      {
        source: context.source,
        component: context.component,
        operation: 'retry_exhausted'
      }
    );

    throw new Error(`Operation failed after ${this.retryConfig.maxAttempts} attempts`);
  }

  private async handleHighPriorityError(
    deploymentId: string,
    errorType: string,
    error: Error
  ): Promise<void> {
    const correlation = this.errorCorrelations.get(errorType);
    
    if (correlation && correlation.frequency >= 3) {
      // If same error occurs frequently, update deployment status
      await this.db.updateDeploymentStatus(deploymentId, 'failed');
      
      // Record the correlation analysis
      await this.db.trackError(
        deploymentId,
        null,
        'error_correlation',
        'error_handler',
        `Frequent ${errorType} detected: ${correlation.frequency} occurrences`,
        JSON.stringify(correlation)
      );
    }
  }

  private isHighPriorityError(errorType: string): boolean {
    return [
      'network_error',
      'permission_error',
      'installation_error'
    ].includes(errorType);
  }

  getErrorCorrelations(): Map<string, ErrorCorrelation> {
    return new Map(this.errorCorrelations);
  }

  async getErrorStats(deploymentId: string): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByPhase: Record<string, number>;
  }> {
    // Implementation would query the error_tracking table
    // This would be implemented based on our database schema
    return {
      totalErrors: 0,
      errorsByType: {},
      errorsByPhase: {}
    };
  }
}
