# Egis Deployment Log Analyzer

A cloud-hosted web application for analyzing Intune and Autopilot deployment logs, built with React (Next.js), NestJS, Supabase, and Vercel.

## Project Overview

The Egis Deployment Log Analyzer is a sophisticated system designed to automate the analysis of deployment logs from Microsoft Intune and Windows Autopilot. It processes various log types, correlates events, and provides real-time insights into deployment status and issues.

### Key Features

- Real-time log processing and analysis
- Priority-based processing queue
- Multi-format log parsing (text, binary, EVTX, ETL)
- Error correlation and tracking
- Performance-optimized for large log files
- Cloud-native architecture

## Technical Architecture

For detailed architecture diagrams, see [ARCHITECTURE.md](docs/diagrams/ARCHITECTURE.md).

The system is composed of several key components:

1. **Frontend Layer**
   - Next.js web application
   - Real-time updates via Supabase subscriptions
   - Modern React components

2. **API Layer**
   - NestJS REST API
   - WebSocket support for real-time updates
   - Authentication via Supabase

3. **Processing Layer**
   - Priority-based queue system
   - Worker thread pool
   - Specialized log parsers

4. **Storage Layer**
   - Supabase PostgreSQL database
   - Redis cache for performance
   - File storage for logs

### Phase 1: Project Setup and Infrastructure

- **Cloud Infrastructure**
  - Supabase for database and authentication
  - Vercel for application hosting
  - Separate dev/prod environments

- **Development Environment**
  - TypeScript for type safety
  - ESLint and Prettier for code quality
  - Vitest for testing

### Phase 2: Analysis & Schema Design

#### Database Schema

```sql
-- Key tables in our Supabase PostgreSQL database
deployments
deployment_phases
log_entries
installation_logs
configuration_logs
event_logs
error_tracking
```

#### Processing System

1. **Priority Queue**
   - High: Real-time critical logs
   - Medium: Batch processing (5-minute intervals)
   - Low: Background processing (10-minute intervals)

2. **Log Parsing**
   - Base Parser with common utilities
   - Specialized parsers for different log types
   - Binary format support (EVTX, ETL, ZIP-based)
   - Worker thread pool for parallel processing

3. **Error Handling**
   - Comprehensive error categorization
   - Retry mechanism with exponential backoff
   - Error correlation tracking
   - Automatic deployment status updates

4. **Performance Optimizations**
   - Streaming for large files
   - Batch processing
   - Worker threads for parallel processing
   - Smart file format detection
   - Memory-efficient processing

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Supabase CLI
- Vercel CLI (optional)

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   cd egis-deployment-log-analyzer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. Initialize the database:
   ```bash
   npm run db:init
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Configuration

#### Supabase Setup

1. Create two projects in Supabase:
   - egis-analyzer-dev
   - egis-analyzer-prod

2. Run the database migrations:
   ```bash
   npm run db:migrate
   ```

#### Processing Configuration

Adjust processing parameters in `config/processing.ts`:
```typescript
{
  maxConcurrentTasks: 5,
  batchSizes: {
    high: 1,
    medium: 5,
    low: 10
  },
  processingIntervals: {
    high: 0,
    medium: 300000,  // 5 minutes
    low: 600000      // 10 minutes
  }
}
```

## Usage

### Log Processing

1. **Upload Logs**
   - Drag and drop log files
   - Bulk upload via API
   - Automatic format detection

2. **Monitor Processing**
   - Real-time status updates
   - Error notifications
   - Processing metrics

3. **View Results**
   - Deployment timeline
   - Error correlation
   - Performance metrics

### API Endpoints

```typescript
POST /api/logs/upload
GET  /api/deployments/:id
GET  /api/deployments/:id/phases
GET  /api/deployments/:id/errors
```

## Development

### Adding New Log Parsers

1. Create a new parser class:
   ```typescript
   export class CustomLogParser extends BaseParser {
     protected parseContent(content: string | Buffer): ParseResult {
       // Implementation
     }
   }
   ```

2. Register in `parserWorker.js`:
   ```javascript
   const parsers = {
     CustomLogParser: new CustomLogParser(),
     // ... other parsers
   };
   ```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test parsers

# Run with coverage
npm test -- --coverage
```

## Deployment

### Development

```bash
# Deploy to dev environment
npm run deploy:dev
```

### Production

```bash
# Deploy to production
npm run deploy:prod
```

## Security

- All logs are processed in isolated environments
- Sensitive data is automatically redacted
- Error tracking excludes sensitive information
- Role-based access control via Supabase

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team.
