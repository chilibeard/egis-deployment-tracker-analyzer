# Egis Deployment Log Analyzer

A cloud-hosted web application to automate and analyze Intune and Autopilot deployment logs.

## Features

- 📊 Real-time deployment status dashboard
- 📱 Responsive, mobile-friendly interface
- 🔄 Live updates using Supabase Realtime
- 📝 Comprehensive log analysis
- 🚀 Fast and efficient log processing

## Project Structure

```
/src
  /frontend              # Next.js web application
    /app                 # Next.js 13+ app directory
    /components         # Reusable React components
    /lib                # Utility functions and helpers
    /types             # TypeScript type definitions
  /backend              # NestJS API
    /src
      /logs            # Log processing and analysis
      /processing      # Background processing service
  /examples             # Example scripts and configurations
    collect-logs.ps1   # PowerShell log collection script
/supabase              # Supabase configurations and migrations
```

## Tech Stack

- **Frontend**: Next.js 14 (React)
- **Backend**: NestJS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/egis-deployment-log-analyzer.git
   cd egis-deployment-log-analyzer
   ```

2. Install frontend dependencies:
   ```bash
   cd src/frontend
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file in the `src/frontend` directory:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

The application is automatically deployed through Vercel:

- Push to any branch for preview deployments
- Push to `main` for production deployment

### Environment Variables

The following environment variables are required in both Vercel and GitHub:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

These are already configured in:
- Vercel project settings
- GitHub repository secrets

## Development Progress

### Completed
- ✅ Project structure and setup
- ✅ Supabase integration
- ✅ Database schema and migrations
- ✅ Frontend deployment list with real-time updates
- ✅ CI/CD pipeline with GitHub Actions

### In Progress
- 🔄 Enhanced UI features
- 🔄 Error handling improvements
- 🔄 Performance optimizations

## Contributing

1. Create a new branch from `main`
2. Make your changes
3. Create a pull request
4. Ensure CI checks pass
5. Request review

## License

MIT
