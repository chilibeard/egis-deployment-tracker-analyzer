import { BaseParser } from './BaseParser';
import { ParseResult, LogEntry } from './types';
import { Buffer } from 'buffer';

export class ETLParser extends BaseParser {
  protected parseContent(content: Buffer): ParseResult {
    try {
      // ETL file format parsing
      // Validate header
      if (!this.isValidETLHeader(content)) {
        return {
          success: false,
          error: 'Invalid ETL file format',
          data: null
        };
      }

      const entries: LogEntry[] = [];
      let offset = 0x20; // Skip file header

      // Process each event record
      while (offset < content.length) {
        const recordHeader = content.slice(offset, offset + 16);
        const recordSize = this.getRecordSize(recordHeader);
        
        if (recordSize <= 0) break;

        const recordData = content.slice(offset + 16, offset + recordSize);
        const entry = this.parseEventRecord(recordData);
        
        if (entry) {
          entries.push(entry);
        }

        offset += recordSize;
      }

      return {
        success: true,
        data: entries
      };
    } catch (error) {
      return {
        success: false,
        error: `ETL parsing error: ${error.message}`,
        data: null
      };
    }
  }

  private isValidETLHeader(content: Buffer): boolean {
    const signature = content.readUInt32LE(0);
    return signature === 0x5456454C; // 'LEVT' in little-endian
  }

  private getRecordSize(header: Buffer): number {
    return header.readUInt32LE(4);
  }

  private parseEventRecord(recordData: Buffer): LogEntry | null {
    try {
      // Extract timestamp (64-bit Windows FILETIME)
      const timestamp = this.parseWindowsFiletime(recordData.readBigInt64LE(0));
      
      // Extract event type
      const eventType = recordData.readUInt16LE(8);
      const level = this.getEventLevel(eventType);

      // Extract process ID and thread ID
      const processId = recordData.readUInt32LE(12);
      const threadId = recordData.readUInt32LE(16);

      // Extract event data
      const dataOffset = 24;
      const dataLength = recordData.length - dataOffset;
      const eventData = recordData.slice(dataOffset, dataOffset + dataLength);

      // Parse event-specific data
      const eventInfo = this.parseEventData(eventData);

      return {
        timestamp,
        level,
        message: eventInfo.message,
        source: 'ETL Trace',
        metadata: {
          processId,
          threadId,
          eventType,
          ...eventInfo.metadata
        }
      };
    } catch (error) {
      return null;
    }
  }

  private parseWindowsFiletime(filetime: bigint): Date {
    // Windows FILETIME is number of 100-nanosecond intervals since January 1, 1601 UTC
    const epochDiff = 116444736000000000n; // Difference between Windows and Unix epoch
    const unixTimestamp = Number((filetime - epochDiff) / 10000n); // Convert to milliseconds
    return new Date(unixTimestamp);
  }

  private getEventLevel(eventType: number): string {
    // ETL event types are typically mapped to trace levels
    if (eventType & 0x0001) return 'critical';
    if (eventType & 0x0002) return 'error';
    if (eventType & 0x0004) return 'warning';
    if (eventType & 0x0008) return 'info';
    if (eventType & 0x0010) return 'verbose';
    return 'unknown';
  }

  private parseEventData(data: Buffer): { message: string; metadata: Record<string, any> } {
    // Default parsing for common event types
    try {
      let offset = 0;
      const metadata: Record<string, any> = {};

      // Read string table
      const stringCount = data.readUInt16LE(offset);
      offset += 2;

      const strings: string[] = [];
      for (let i = 0; i < stringCount; i++) {
        const length = data.readUInt16LE(offset);
        offset += 2;
        strings.push(data.slice(offset, offset + length).toString('utf16le'));
        offset += length;
      }

      // Read property table
      const propertyCount = data.readUInt16LE(offset);
      offset += 2;

      for (let i = 0; i < propertyCount; i++) {
        const nameIndex = data.readUInt16LE(offset);
        offset += 2;
        const valueIndex = data.readUInt16LE(offset);
        offset += 2;

        if (nameIndex < strings.length && valueIndex < strings.length) {
          metadata[strings[nameIndex]] = strings[valueIndex];
        }
      }

      // Construct message from remaining strings
      const message = strings
        .slice(propertyCount * 2)
        .join(' ')
        .trim();

      return { message, metadata };
    } catch (error) {
      return {
        message: 'Failed to parse event data',
        metadata: {}
      };
    }
  }
}
