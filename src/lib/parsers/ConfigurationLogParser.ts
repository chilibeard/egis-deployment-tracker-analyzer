import { BaseParser } from './BaseParser';
import { ConfigurationLog, ParserResult } from './types';

export class ConfigurationLogParser extends BaseParser<ConfigurationLog> {
  protected parseTimestamp(line: string): Date | null {
    const match = line.match(/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/);
    return match ? this.standardizeTimestamp(match[0]) : null;
  }

  protected parseLogLevel(line: string): string | null {
    const match = line.match(/\s(INFO|WARNING|ERROR|DEBUG):/);
    return match ? match[1] : null;
  }

  public parse(content: string): ParserResult<ConfigurationLog> {
    try {
      const lines = content.split('\n');
      const configLog: ConfigurationLog = {
        configType: '',
        component: '',
        status: 'pending',
        settings: {},
      };

      let currentComponent = '';
      let currentSection = '';

      for (const line of lines) {
        const timestamp = this.parseTimestamp(line);
        
        // Extract config type and component from header
        if (line.includes('Configuring')) {
          const match = line.match(/Configuring\s(.+?)\s(settings|configuration|registry)/i);
          if (match) {
            configLog.configType = match[2].toLowerCase();
            configLog.component = match[1];
            currentComponent = match[1];
          }
        }

        // Handle registry settings
        const registryMatch = line.match(/Adding\s([^=]+)=(.+)$/);
        if (registryMatch) {
          const key = registryMatch[1].trim();
          const value = registryMatch[2].trim();
          
          // Organize settings hierarchically
          if (key.includes('\\')) {
            const parts = key.split('\\');
            let current = configLog.settings;
            for (let i = 0; i < parts.length - 1; i++) {
              const part = parts[i];
              if (!current[part]) {
                current[part] = {};
              }
              current = current[part];
            }
            current[parts[parts.length - 1]] = value;
          } else {
            configLog.settings[key] = value;
          }
        }

        // Handle configuration status
        if (line.includes('successfully')) {
          configLog.status = 'applied';
          configLog.appliedAt = timestamp || new Date();
        } else if (line.includes('failed') || line.includes('ERROR:')) {
          configLog.status = 'failed';
          const errorMatch = line.match(/ERROR:\s(.+)$/);
          if (errorMatch) {
            configLog.errorMessage = errorMatch[1];
          }
        }

        // Handle section-based configuration
        if (line.match(/^\[.+\]$/)) {
          currentSection = line.replace(/[\[\]]/g, '').trim();
          if (!configLog.settings[currentSection]) {
            configLog.settings[currentSection] = {};
          }
        } else if (currentSection && line.includes('=')) {
          const [key, value] = line.split('=').map(s => s.trim());
          if (key && value) {
            configLog.settings[currentSection][key] = value;
          }
        }
      }

      return {
        success: true,
        data: configLog,
        priority: this.getProcessingPriority(content)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse configuration log: ${error.message}`,
        priority: 'high'
      };
    }
  }

  protected getProcessingPriority(content: string): 'high' | 'medium' | 'low' {
    if (content.includes('ERROR:') || content.includes('failed')) {
      return 'high';
    }
    
    // Security or network-related configurations are high priority
    if (
      content.toLowerCase().includes('security') ||
      content.toLowerCase().includes('network') ||
      content.toLowerCase().includes('firewall') ||
      content.toLowerCase().includes('certificate')
    ) {
      return 'high';
    }

    // UI or non-critical configurations are medium priority
    if (
      content.toLowerCase().includes('ui') ||
      content.toLowerCase().includes('display') ||
      content.toLowerCase().includes('theme')
    ) {
      return 'low';
    }

    return 'medium';
  }
}
