# PROJECT_PLAN_AND_PROMPT

## 1. Comprehensive Project Plan

### Project Overview
Build a **modern, responsive web application** to **automate** the upload, processing, and analysis of log files from an **Autopilot and Intune deployment process**. Logs will be collected via a PowerShell script and uploaded for analysis automatically. The system should organize logs per deployment (using machine name as the folder identifier) and provide a **real-time dashboard** for easy visualization and status tracking.

### Proposed Tech Stack
- **Frontend:** **React** with **Next.js** – chosen for server-side rendering (SSR) to boost performance.  
- **Backend:** **Node.js** with **NestJS** – progressive framework for structured, scalable server-side development using TypeScript.  
- **Database & Storage:** **Supabase** – managed PostgreSQL + file storage.  
- **Real-Time Processing:** **Supabase Realtime** (leveraging WebSockets).  
- **Hosting:** **Vercel** (for Next.js) and **Supabase** (for DB/storage, plus any serverless Edge Functions, if used).  
- **DevOps:** **GitHub Actions** + **Vercel** Preview Deployments for Continuous Integration/Deployment.

### Development Environment Best Practices

1. **Cloud-Hosted for Development & Production**  
   - Use **Vercel** for continuous preview builds. Each commit or pull request triggers a build, creating a preview URL where you can test changes immediately without needing local server configurations.  
   - Use **Supabase** in **“development”** or **“staging”** mode for your dev database and storage. You can create a separate **project** in Supabase for dev vs. production.  
   - This means your local environment just needs Node.js installed so you can work on code, run minimal checks/tests, and push commits to GitHub. No Docker or local Postgres required.

2. **Version Control & CI/CD**  
   - Use GitHub for source control. Merge changes via pull requests to keep a history of modifications.  
   - GitHub Actions can run automated tests (unit, lint, etc.) when you push or open a PR.  
   - Vercel’s Preview Deployment automatically spins up a dev URL to test your Next.js and NestJS changes. Supabase can hold separate “dev” credentials so the preview environment does not interfere with your production DB.

3. **Local Code, Immediate Cloud Deploy**  
   - You’ll primarily code locally in your favorite IDE (VSCode, JetBrains, etc.).  
   - After each update, you push commits to GitHub; the commit triggers a Vercel Preview build.  
   - You can also run the app locally if you want (e.g., `pnpm install && pnpm run dev`), but the official dev environment is effectively “in the cloud.”

4. **Environment Variables & Secrets**  
   - Store Supabase keys, JWT secrets, etc. in Vercel’s “Project Settings > Environment Variables.”  
   - Do the same in Supabase for any Edge Functions that need secrets or environment variables.  
   - Keep `.env` files out of version control. If you do local runs, replicate these env vars locally in a `.env` file.

### Feature Breakdown

#### 1. Automated Log File Upload & Processing
- **PowerShell Script → Supabase Storage:** The script collects Autopilot/Intune logs, uploads them to a bucket in your Supabase dev project.  
- **Backend (NestJS) or Supabase Edge Functions:** Detect new files and parse them. (Alternatively, the script can call an upload endpoint on your NestJS server running in Vercel if that suits your workflow.)  
- **Parsing & Conversion:** Convert logs to structured JSON, insert into the `Logs` table. Record errors in `Error Logs` table.  
- **Status Updates & Notifications:** The `Deployments` table tracks progress, and real-time subscriptions notify the Next.js dashboard.

#### 2. Database Design (Supabase PostgreSQL)
- **Deployments Table:** One row per deployment/machine (machine_name, status, timestamps, etc.).  
- **Logs Table:** Stores parsed lines/events for each deployment.  
- **Error Logs Table:** Tracks parse failures or corrupted data.  
- (Optional) **Users Table:** If you add authentication in the future.

#### 3. Dashboard & UI Components
- **Main Dashboard:** Summarizes all deployments (machine name, status, error counts).  
- **Deployment Detail Page:** Shows logs in a table, filters by severity, optional error notifications, ZIP download for raw files.  
- **Realtime Updates:** Leverage Supabase Realtime to reflect new logs or status changes immediately.

#### 4. Deployment & Hosting Strategy
- **Vercel:**  
  - Production builds are deployed on merges to `main` (or your production branch).  
  - Preview builds are created for each PR or commit, letting you test changes in a fully hosted environment.  
- **Supabase:**  
  - Create a **dev** project for your “development environment.”  
  - Create a **production** project for final usage.  
  - Migrate schema changes from dev to production as needed (Supabase offers a migration or you can run SQL scripts).
- **Monitoring (Optional):**  
  - **Sentry** for tracking exceptions (both server and client sides).  
  - **LogRocket** or similar for user session replay (optional for an internal app).

### Next Steps (Iterative Development Plan)

1. **Initial Setup & Discovery**  
   - Create a Supabase “dev” project (DB + storage).  
   - Set up a Vercel project pointing to your GitHub repo.  
   - Generate a basic Next.js + NestJS starter (or use Nx/Turborepo).  
   - Confirm connectivity to Supabase from both local code and Vercel.

2. **Sprint 1 – File Upload & Parsing**  
   - Implement the flow from PowerShell → Supabase → parse with NestJS.  
   - Insert logs in the DB; handle errors.  
   - Validate success via Vercel Preview deployments.

3. **Sprint 2 – Dashboard UI & Real-Time**  
   - Next.js pages for listing deployments & viewing logs.  
   - Subscribe to changes in the DB (Supabase Realtime).  
   - Provide a “download logs” feature.

4. **Sprint 3 – Notifications & Monitoring**  
   - Show errors in the UI when parsing fails.  
   - Integrate Sentry for runtime error tracking.  
   - Expand tests (integration, E2E).

5. **Sprint 4 – Refinements & Future-Proofing**  
   - Optimize queries (indexes, search).  
   - Secure any “dev” endpoints if you do plan a limited production rollout.  
   - Plan for possible authentication, advanced analytics, or archiving.

**Outcome:**  
A robust system that’s cloud-hosted at **all times**—for both development and production—via **Vercel** (frontend & partial backend) and **Supabase** (database, storage, optional serverless functions).

---

## 2. Consolidated Step-by-Step Prompt

```markdown
[BEGIN CONSOLIDATED PROMPT]

Project Title:
"Autopilot & Intune Deployment Log Analysis Web App"

Project Overview:
We need a modern, responsive web application to automate the collection, parsing, and analysis of logs generated during Autopilot and Intune deployments. Logs will be captured via a PowerShell script that uploads them to our web app. Each folder of logs corresponds to a single deployment (named after the machine). We will store parsed data in a Supabase PostgreSQL database, use React (Next.js) for the frontend, NestJS for the backend, and Vercel for deployment.

This project is **cloud-hosted** for both development and production. We'll rely on:
- **Vercel** for automatic preview deployments on each commit or PR,  
- **Supabase** (dev vs. prod projects) for the database and file storage.

We will follow these phases and steps:

--------------------------------------------------------------------------------
Phase 1: Discovery
1. Confirm project scope & goals.
2. Inventory the provided folder of logs and determine all recognized file types.
3. Confirm overall tech stack, focusing on cloud-hosted dev (Vercel + Supabase).

Output for Phase 1:
- A list of all discovered file formats and a short summary of how we might parse them.
- Confirmation that we’re using React (Next.js), NestJS, Supabase, and Vercel for both dev and production.
- Explanation of how commits trigger cloud deployments (preview vs. production).

Do not move on to Phase 2 until Phase 1 is fully addressed.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
Phase 2: Analysis & Schema Design
1. Create detailed parsing strategies for each log type based on the comprehensive log inventory:
   - Installation logs (success/failure patterns)
   - Windows Event Logs (.evtx)
   - Configuration logs
   - Diagnostic reports
   - Binary format logs

2. Design database schema optimized for the five deployment phases:
   - Initial Setup
   - Device Enrollment
   - Software Deployment
   - Configuration
   - Validation

3. Implement priority-based processing:
   - High Priority: Real-time processing for critical deployment logs
   - Medium Priority: Batch processing for configuration logs
   - Low Priority: Background processing for diagnostic reports

4. Design error handling and monitoring system:
   - Installation failures
   - Configuration issues
   - Network-related issues
   - Error frequency tracking
   - Correlation analysis

Output for Phase 2:
- Complete database schema for Supabase, incorporating all log types and their relationships
- Processing pipeline design with priority queues
- Error handling and monitoring strategy
- Performance optimization plan for large log files and binary formats

Reference: See LOG_FILES_INVENTORY.md for detailed log format specifications and processing requirements

Don't proceed to Phase 3 until Phase 2 is completed.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
Phase 3: Implementation
1. Backend Foundations (NestJS) – set up routes/services to ingest logs from Supabase Storage or direct upload.
2. Database Integration (Supabase dev project) – create tables, handle file-to-database insertion logic.
3. Frontend Foundations (Next.js) – basic dashboard listing deployments, hooking up Realtime updates.
4. CI/CD Setup – confirm that GitHub pushes build on Vercel, referencing dev Supabase credentials.

Output for Phase 3:
- Code structure for backend and frontend in the GitHub repo.
- Demonstration of the end-to-end pipeline (upload → parse → store → display) via a Vercel Preview deployment link.
- A test scenario with sample logs to confirm parsing and UI reflection.

Don't proceed to Phase 4 until Phase 3 is validated.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
Phase 4: Testing & Refinement
1. Comprehensive testing – unit, integration, E2E (possibly via a test environment on Vercel).
2. UI/UX improvements – filters, search, error notifications, optional charts.
3. Performance & security checks – indexing, controlling dev secrets, Sentry/LogRocket integration.

Output for Phase 4:
- Test results (including error-handling scenarios).
- Screenshots or descriptions of improved UI features in the preview deployment.
- Confirmation that performance & monitoring needs are met.

Do not move to Phase 5 until correctness is validated.
--------------------------------------------------------------------------------

--------------------------------------------------------------------------------
Phase 5: Deployment & Maintenance
1. Production deployment on Vercel and final checks (connecting to a “production” Supabase project).
2. Documentation – README, developer guides, usage instructions for the PowerShell script.
3. Maintenance plan – user auth if needed, archiving old logs, advanced analytics.

Output for Phase 5:
- Confirmation that the app is live on a production URL, referencing the production Supabase environment.
- Published documentation (links, instructions).
- Roadmap for next features or enhancements.

--------------------------------------------------------------------------------

Instructions to the AI/IDE:
1. **Follow the phases in order.** Provide the requested deliverables for each phase before moving on.
2. **Wait for my confirmation** at the end of each phase before initiating the next phase.
3. Maintain a log of any decisions or code changes so we can reference them later.

[END CONSOLIDATED PROMPT]
