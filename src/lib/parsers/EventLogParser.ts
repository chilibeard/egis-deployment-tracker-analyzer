import { BaseParser } from './BaseParser';
import { EventLog, ParserResult } from './types';

export class EventLogParser extends BaseParser<EventLog> {
  protected parseTimestamp(line: string): Date | null {
    const match = line.match(/TimeCreated\s*:\s*(.+?)(?:\r?\n|$)/);
    return match ? this.standardizeTimestamp(match[1]) : null;
  }

  protected parseLogLevel(line: string): string | null {
    // Event logs typically don't have a standard level field
    // We'll determine it based on the event ID and message content
    return null;
  }

  public parse(content: string): ParserResult<EventLog> {
    try {
      const eventLog: EventLog = {
        eventId: 0,
        providerName: '',
        channel: '',
        level: 'Information',
        timestamp: new Date(),
        message: '',
        metadata: {}
      };

      // Extract event ID
      const eventIdMatch = content.match(/Id\s*:\s*(\d+)/);
      if (eventIdMatch) {
        eventLog.eventId = parseInt(eventIdMatch[1], 10);
      }

      // Extract provider name
      const providerMatch = content.match(/ProviderName\s*:\s*(.+?)(?:\r?\n|$)/);
      if (providerMatch) {
        eventLog.providerName = providerMatch[1].trim();
      }

      // Extract timestamp
      const timestamp = this.parseTimestamp(content);
      if (timestamp) {
        eventLog.timestamp = timestamp;
      }

      // Extract message
      const messageMatch = content.match(/Message\s*:\s*(.+?)(?:\r?\n|$)/s);
      if (messageMatch) {
        eventLog.message = messageMatch[1].trim();
      }

      // Extract task category if present
      const taskMatch = content.match(/TaskCategory\s*:\s*(.+?)(?:\r?\n|$)/);
      if (taskMatch) {
        eventLog.taskCategory = taskMatch[1].trim();
      }

      // Extract keywords if present
      const keywordsMatch = content.match(/Keywords\s*:\s*(.+?)(?:\r?\n|$)/);
      if (keywordsMatch) {
        eventLog.keywords = keywordsMatch[1].split(',').map(k => k.trim());
      }

      // Determine level based on content
      if (eventLog.message.toLowerCase().includes('error')) {
        eventLog.level = 'Error';
      } else if (eventLog.message.toLowerCase().includes('warn')) {
        eventLog.level = 'Warning';
      }

      // Store any additional metadata
      const metadataMatches = content.matchAll(/(\w+)\s*:\s*(.+?)(?:\r?\n|$)/g);
      for (const match of metadataMatches) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!['Id', 'ProviderName', 'Message', 'TimeCreated', 'TaskCategory', 'Keywords'].includes(key)) {
          eventLog.metadata![key] = value;
        }
      }

      return {
        success: true,
        data: eventLog,
        priority: this.getProcessingPriority(content)
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to parse event log: ${error.message}`,
        priority: 'high'
      };
    }
  }

  protected getProcessingPriority(content: string): 'high' | 'medium' | 'low' {
    // Check for critical event IDs or error messages
    if (
      content.includes('Error') ||
      content.includes('Critical') ||
      content.includes('Authentication failed') ||
      content.includes('Device enrollment')
    ) {
      return 'high';
    }

    // Check for warning messages or important status updates
    if (
      content.includes('Warning') ||
      content.includes('Configuration changed') ||
      content.includes('Policy applied')
    ) {
      return 'medium';
    }

    return 'low';
  }
}
