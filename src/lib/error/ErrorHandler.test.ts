import { ErrorHandler } from './ErrorHandler';
import { DatabaseService } from '../db/DatabaseService';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock DatabaseService
const mockDb = {
  trackError: vi.fn(),
  updateDeploymentStatus: vi.fn(),
} as unknown as DatabaseService;

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler(mockDb);
    vi.clearAllMocks();
  });

  describe('Error Categorization', () => {
    it('should correctly categorize network errors', async () => {
      const error = new Error('network timeout occurred');
      await errorHandler.handleError('deploy1', 'phase1', error, { source: 'test' });
      
      expect(mockDb.trackError).toHaveBeenCalledWith(
        'deploy1',
        'phase1',
        'network_error',
        'test',
        error.message,
        error.stack
      );
    });

    it('should correctly categorize installation errors', async () => {
      const error = new Error('installation failed: missing dependencies');
      await errorHandler.handleError('deploy1', 'phase1', error, { source: 'test' });
      
      expect(mockDb.trackError).toHaveBeenCalledWith(
        'deploy1',
        'phase1',
        'installation_error',
        'test',
        error.message,
        error.stack
      );
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations with exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('success');

      const result = await errorHandler.retryWithBackoff(
        operation,
        { deploymentId: 'deploy1', source: 'test' }
      );

      expect(operation).toHaveBeenCalledTimes(3);
      expect(result).toBe('success');
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent error'));

      await expect(
        errorHandler.retryWithBackoff(
          operation,
          { deploymentId: 'deploy1', source: 'test' }
        )
      ).rejects.toThrow('Operation failed after 3 attempts');
    });
  });

  describe('Error Correlation', () => {
    it('should track error frequency', async () => {
      const error = new Error('network error');
      
      // Simulate multiple errors
      await errorHandler.handleError('deploy1', 'phase1', error, { 
        source: 'test',
        component: 'network' 
      });
      await errorHandler.handleError('deploy1', 'phase1', error, { 
        source: 'test',
        component: 'network' 
      });

      const correlations = errorHandler.getErrorCorrelations();
      const networkErrors = correlations.get('network_error');
      
      expect(networkErrors?.frequency).toBe(2);
      expect(networkErrors?.affectedComponents).toContain('network');
    });

    it('should trigger high priority handling for frequent errors', async () => {
      const error = new Error('installation failed');
      
      // Simulate multiple installation errors
      for (let i = 0; i < 3; i++) {
        await errorHandler.handleError('deploy1', 'phase1', error, { 
          source: 'test',
          component: 'installer' 
        });
      }

      expect(mockDb.updateDeploymentStatus).toHaveBeenCalledWith('deploy1', 'failed');
    });
  });

  describe('Component Integration', () => {
    it('should track errors across multiple components', async () => {
      await errorHandler.handleError('deploy1', 'phase1', 
        new Error('network error'), 
        { source: 'test', component: 'network' }
      );
      
      await errorHandler.handleError('deploy1', 'phase1',
        new Error('installation error'),
        { source: 'test', component: 'installer' }
      );

      const correlations = errorHandler.getErrorCorrelations();
      expect(correlations.size).toBe(2);
      
      const components = Array.from(correlations.values())
        .flatMap(c => c.affectedComponents);
      expect(components).toContain('network');
      expect(components).toContain('installer');
    });
  });
});
