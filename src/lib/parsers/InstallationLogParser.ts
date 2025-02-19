import { BaseParser } from './BaseParser';
import { InstallationLog, ParserResult } from './types';

export class InstallationLogParser extends BaseParser<InstallationLog> {
  protected parseTimestamp(line: string): Date | null {
    const match = line.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/);
    return match ? this.standardizeTimestamp(match[0]) : null;
  }

  protected parseLogLevel(line: string): string | null {
    const match = line.match(/\s(INFO|WARNING|ERROR|DEBUG):/);
    return match ? match[1] : null;
  }

  public parse(content: string): ParserResult<InstallationLog> {
    try {
      const lines = content.split('\n');
      const firstLine = lines[0];
      
      // Extract application info from first line
      const appMatch = firstLine.match(/Installing|Configuring\s(.+?)\s(\d+\.\d+\.\d+\.\d+)/);
      if (!appMatch) {
        return {
          success: false,
          error: 'Unable to determine application details',
          priority: this.getProcessingPriority(content)
        };
      }

      const installationLog: InstallationLog = {
        applicationName: appMatch[1],
        version: appMatch[2],
        status: 'started',
        startTime: this.parseTimestamp(firstLine) || new Date(),
        metadata: {}
      };

      // Process subsequent lines
      for (const line of lines) {
        const timestamp = this.parseTimestamp(line);
        if (!timestamp) continue;

        if (line.includes('Installation successful')) {
          installationLog.status = 'completed';
          installationLog.completionTime = timestamp;
        } else if (line.includes('failed') || line.includes('ERROR:')) {
          installationLog.status = 'failed';
          installationLog.completionTime = timestamp;
          
          // Extract error details
          const errorMatch = line.match(/ERROR:\s(.+?)(?:\s\((\w+)\))?$/);
          if (errorMatch) {
            installationLog.errorMessage = errorMatch[1];
            installationLog.errorCode = errorMatch[2];
          }
        } else if (line.includes('Installing')) {
          installationLog.status = 'in_progress';
        }

        // Extract install location if present
        const locationMatch = line.match(/Installing to: (.+)$/);
        if (locationMatch) {
          installationLog.installLocation = locationMatch[1];
        }

        // Collect additional metadata
        const configMatch = line.match(/Adding ([^=]+)=(.+)$/);
        if (configMatch) {
          installationLog.metadata![configMatch[1].trim()] = configMatch[2].trim();
        }
      }

      return {
        success: true,
        data: installationLog,
        priority: this.getProcessingPriority(content)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse installation log: ${error.message}`,
        priority: 'high' // Parsing errors are high priority
      };
    }
  }

  protected getProcessingPriority(content: string): 'high' | 'medium' | 'low' {
    if (content.includes('ERROR:') || content.includes('failed')) {
      return 'high';
    }
    if (content.includes('Installing') || content.includes('Configuration')) {
      return 'high'; // Installation progress is high priority
    }
    return 'medium';
  }
}
