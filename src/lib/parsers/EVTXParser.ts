import { BaseParser } from './BaseParser';
import { ParseResult, LogEntry } from './types';
import { Buffer } from 'buffer';

export class EVTXParser extends BaseParser {
  protected parseContent(content: Buffer): ParseResult {
    try {
      // EVTX file format parsing
      // Header validation (EVTX format starts with 'ElfFile')
      if (!this.isValidEVTXHeader(content)) {
        return {
          success: false,
          error: 'Invalid EVTX file format',
          data: null
        };
      }

      const entries: LogEntry[] = [];
      let offset = 0x1000; // Skip file header

      // Process each chunk
      while (offset < content.length) {
        const chunkHeader = content.slice(offset, offset + 0x200);
        const chunkSize = this.getChunkSize(chunkHeader);
        
        if (chunkSize <= 0) break;

        const chunkData = content.slice(offset + 0x200, offset + chunkSize);
        const chunkEntries = this.parseChunk(chunkData);
        entries.push(...chunkEntries);

        offset += chunkSize;
      }

      return {
        success: true,
        data: entries
      };
    } catch (error) {
      return {
        success: false,
        error: `EVTX parsing error: ${error.message}`,
        data: null
      };
    }
  }

  private isValidEVTXHeader(content: Buffer): boolean {
    const signature = content.slice(0, 8).toString('utf8');
    return signature === 'ElfFile\0';
  }

  private getChunkSize(header: Buffer): number {
    // Read 4-byte chunk size from header
    return header.readUInt32LE(4);
  }

  private parseChunk(chunkData: Buffer): LogEntry[] {
    const entries: LogEntry[] = [];
    let offset = 0;

    while (offset < chunkData.length) {
      const eventHeader = chunkData.slice(offset, offset + 24);
      const eventSize = eventHeader.readUInt32LE(4);

      if (eventSize <= 0) break;

      const eventData = chunkData.slice(offset + 24, offset + eventSize);
      const entry = this.parseEventRecord(eventData);
      
      if (entry) {
        entries.push(entry);
      }

      offset += eventSize;
    }

    return entries;
  }

  private parseEventRecord(eventData: Buffer): LogEntry | null {
    try {
      // Extract basic event information
      const timestamp = new Date(eventData.readBigInt64LE(0));
      const eventId = eventData.readUInt32LE(8);
      const level = this.getEventLevel(eventData.readUInt16LE(12));

      // Extract event message (simplified)
      const messageStart = 24; // After header
      let messageLength = 0;
      while (messageLength < eventData.length - messageStart && 
             eventData[messageStart + messageLength] !== 0) {
        messageLength++;
      }
      
      const message = eventData
        .slice(messageStart, messageStart + messageLength)
        .toString('utf16le');

      return {
        timestamp,
        level,
        message,
        source: 'Windows Event Log',
        metadata: {
          eventId,
          computer: this.extractString(eventData, messageStart + messageLength + 2),
          channel: this.extractString(eventData, messageStart + messageLength + 4)
        }
      };
    } catch (error) {
      return null;
    }
  }

  private getEventLevel(level: number): string {
    switch (level) {
      case 1: return 'critical';
      case 2: return 'error';
      case 3: return 'warning';
      case 4: return 'info';
      case 5: return 'verbose';
      default: return 'unknown';
    }
  }

  private extractString(data: Buffer, offset: number): string {
    let length = 0;
    while (length < data.length - offset && 
           data[offset + length] !== 0 && 
           data[offset + length + 1] !== 0) {
      length += 2;
    }
    return data.slice(offset, offset + length).toString('utf16le');
  }
}
