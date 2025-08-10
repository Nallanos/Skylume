# Bluesky Copilot Development Guide

## Architecture Overview

This is a **hybrid TypeScript/Python marketing automation platform** for Bluesky with three primary components:

- **AdonisJS Backend** (`app/`): Authentication, scheduling, account management with PostgreSQL + Redis
- **React Frontend** (`inertia/`): Inertia.js SSR with TailwindCSS and shadcn/ui components
- **Python AI Service** (`python-service/`): Semantic clustering and audience analysis with ML pipelines

## Key Development Patterns

### User Authentication Flow
- Users create accounts via `AccountController.createAccount()` which creates both `User` and `Account` models simultaneously
- Three auth methods: OAuth (planned), app passwords, and classic passwords stored in `User.password`
- Session management spans both `SessionController` and `AccountController` due to unified account creation

### Queue Architecture (BullMQ + Redis)
- **Post Scheduling**: `SchedulingService` manages delayed post publishing to Bluesky
- **AI Analysis**: `AiSchedulerService` queues audience analysis jobs for Python worker
- **Commands**: `node ace queue:work` starts workers, `node ace queue:status` shows stats
- **Redis Keys**: Jobs use patterns like `job:audience_analysis_*` and `job:scheduling_*`

### Python-TypeScript Integration
- Python worker (`analysis_worker.py`) polls AdonisJS API for analysis jobs via HTTP
- Semantic clustering uses `ProfileClusterer` with HDBSCAN, LDA, and UMAP embeddings
- Results flow back as JSON with cluster metadata (cohesion, variance, tags, keywords)

### Frontend State Management
- **Inertia.js pages** in `inertia/pages/` with shared props via `Layout` component
- **Dynamic dashboard**: Shows `AddAccount` component when no accounts exist
- **CSRF tokens**: Auto-injected into axios and fetch requests in `inertia/app/app.tsx`

## Essential Commands

```bash
# Development
npm run dev                    # Start with HMR
node ace migration:run         # Apply database migrations  
node ace queue:work           # Start BullMQ worker
python python-service/analysis_worker.py  # Start AI worker

# Database
node ace db:seed              # Seed test data
node ace make:migration       # Create migration
```

## Model Relationships & Database
- `User` hasMany `Account` (1:N - one user, multiple Bluesky accounts)
- `Account` stores `session` column for OAuth tokens and `appPassword` for app passwords
- `Scheduling` belongs to both `User` and `Account` for post scheduling
- Database config in `config/database.ts` uses PostgreSQL with Lucid ORM

## Project-Specific Conventions

### File Organization
- `#models/*`, `#services/*`, `#controllers/*` use AdonisJS import aliases
- React components in `inertia/components/` with TypeScript interfaces
- Python services organized by responsibility in `ai_service/services/`

### Error Handling & Logging
- Controllers catch errors with `session.flash()` messages for user feedback  
- Python services use structured logging with emoji prefixes (🔍, ✅, ❌)
- BullMQ jobs have retry logic with exponential backoff in `SchedulingService`

### Authentication Context
- Current user available as `auth.user` in controllers and `props.user` in Inertia pages
- Account creation requires both handle validation and Bluesky API verification
- Rate limiting stored per-account in `Account.isRateLimited` field

### Integration Points
- Bluesky API via `@atproto/api` in `AccountService` and `account_manager.ts`
- Redis for both BullMQ queues and session storage
- Python ML pipeline communicates results through REST API endpoints

Remember: This codebase prioritizes reducing user friction in signup flow - always consider UX impact when modifying authentication or account creation paths.
