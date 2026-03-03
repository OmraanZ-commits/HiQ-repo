# Unilever Network Visibility Portal

## Overview
A central portal for managing network visibility across all Unilever product categories. Built with Unilever's brand identity (blue gradient header, Open Sans typography). Uses MVC architecture with a Python/FastAPI backend and Saga pattern for orchestrating multi-service workflows.

## Architecture

### Frontend (MVC)
- **Models**: `shared/schema.ts` (frontend types) + `server_py/models.py` (Pydantic models)
- **Views**: `client/src/components/` and `client/src/pages/` - React components
- **Controllers**: `client/src/controllers/` - Business logic hooks (useNetworkEntries, useNetworkEntryForm, useLifecycleData)

### Backend (Layered Microservices + Saga)
Each microservice follows: **Router → Service → Storage**
- **Router**: Thin HTTP layer (request parsing, response formatting, status codes)
- **Service**: Business logic, validation, orchestration, compensating actions
- **Storage**: Database access only, no business logic
- **Saga Orchestrator**: Coordinates multi-step workflows across services with compensation on failure

## Tech Stack
- Frontend: React + TypeScript, Vite, TanStack Query, wouter routing, shadcn/ui
- Backend: Python 3.12 + FastAPI (uvicorn)
- Database: PostgreSQL via SQLAlchemy (Replit dev / Docker local / Azure PostgreSQL production)
- Proxy: Express.js serves Vite frontend and proxies /api/* to FastAPI in development
- Styling: Tailwind CSS with Unilever-branded color tokens (HSL 199 blue primary)
- Pattern: Orchestration-based Saga for multi-service transactions

## Key Features
- **Saga-orchestrated status transitions**: Draft→Active goes through validate → record transition → update entry → recompute lifecycle, with automatic rollback on failure
- **Lifecycle color flags**: Amber (Production Started, FTR Approved), Red (Stock Movement Initiated), Blinking Red (CBU Ready for Transition) — shown in table Trigger column, edit page, detail dialog, and status flow
- Dashboard with gradient stat cards (Total, Active, Draft, Production Started)
- Data table with CBU Created Date, Assigned Person columns, search, status filtering, and Trigger column
- Fullscreen edit page with tabbed form (Basic Info, Product Details, Dimensions, Distribution)
- Status flow progress bar (7 steps: Draft → Active → Pricing Updated → Production Started → FTR Approved → Stock Movement Initiated → CBU Ready for Transition)
- Distribution tab: light-themed cards (Geography/Depots/Channels) with select-all toggles, distribution matrix preview
- MT channel as parent group with 5 sub-channels; "partial" badge when partially selected; leaf count = 8
- View detail dialog with organized sections and status flow
- Year auto-calculated from CBU Created Date
- Network Change Date auto-calculated as CBU Created Date + 15 days for Draft entries
- Date validation: Change Date min = CBU+1 day, Start Date min = Change Date, End Date min = Start Date
- Draft→Active validation: requires all 3 dates + at least 1 cluster, depot, channel
- Confirmation dialog before activation showing: dates, predecessor/successor CBU, distribution matrix preview
- Assigned Person field with avatar initials in table
- Read-only fields for data-sourced values; editable fields for manual input
- No create new / delete entry actions (view + edit only)
- Draft entries seed with blank start/end dates and empty distribution fields
- Configurable API base URL (VITE_API_BASE_URL) for separate frontend/backend deployment

## Status Flow
7-step progression exported as STATUS_FLOW constant:
1. Draft
2. Active
3. Pricing Updated
4. Production Started
5. FTR Approved
6. Stock Movement Initiated
7. CBU Ready for Transition

## Data Model
`NetworkEntry` with ~38 fields covering:
- Basic info (CBU code, dates, annexure, network type, assigned person)
- Product details (brand, BG, format, profit centre, etc.)
- Dimensions (weight, length, width, height, EAN, ITF)
- Distribution (geography=18 Indian clusters, depot=24 depot codes, channel=9 channels with MT sub-channels, all from Excel master data)

## File Structure

### Frontend
- `client/src/controllers/useNetworkEntries.ts` - Dashboard controller hook
- `client/src/controllers/useNetworkEntryForm.ts` - Edit page controller hook (uses saga endpoint for activation)
- `client/src/controllers/useLifecycleData.ts` - Lifecycle data hook + flag class helpers
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/pages/edit-entry.tsx` - Fullscreen edit page
- `client/src/components/unilever-header.tsx` - Branded header
- `client/src/components/stats-cards.tsx` - Gradient stat cards
- `client/src/components/status-flow.tsx` - 7-step status progress bar with lifecycle flag overlay
- `client/src/components/network-table.tsx` - Data table with Trigger column for lifecycle flags
- `client/src/components/entry-detail-dialog.tsx` - View details dialog with status flow and lifecycle info
- `client/src/components/people-picker.tsx` - Searchable people picker with avatars
- `client/src/lib/distribution-data.ts` - Master data constants (clusters, depots, channels from Excel)
- `client/src/lib/queryClient.ts` - API client with configurable VITE_API_BASE_URL
- `shared/schema.ts` - Data model, types, and STATUS_FLOW constant

### Python Backend — Microservices (Router → Service → Storage)

#### List Master Service
- `server_py/services/list_master/router.py` - FastAPI router (thin HTTP layer)
- `server_py/services/list_master/service.py` - Business logic: update_status, compensate_status_update
- `server_py/services/list_master/storage.py` - PostgreSQL CRUD storage

#### State Management Service
- `server_py/services/state_management/router.py` - FastAPI router (thin HTTP layer)
- `server_py/services/state_management/service.py` - Business logic: validate_transition, record_transition, compensate_transition
- `server_py/services/state_management/storage.py` - PostgreSQL storage for statuses + transitions

#### Lifecycle Service
- `server_py/services/lifecycle/router.py` - FastAPI router
- `server_py/services/lifecycle/service.py` - Business logic: recompute_entry, recompute_all
- `server_py/services/lifecycle/engine.py` - Computation logic: maps status → colorFlag/flagLabel/urgencyLevel/doh

#### Saga Orchestrator
- `server_py/saga/base.py` - SagaOrchestrator base class + SagaStep: executes steps in order, compensates in reverse on failure, logs to saga_logs table
- `server_py/saga/transition_saga.py` - TransitionSaga: 4-step saga (validate → record transition → update entry → recompute lifecycle)
- `server_py/saga/router.py` - Saga API endpoints (execute transition, query saga logs)

#### Core
- `server_py/main.py` - FastAPI app entry point, CORS, router mounting, service wiring, seed data
- `server_py/models.py` - Pydantic models (NetworkEntry, StateTransition, STATUS_FLOW)
- `server_py/db.py` - SQLAlchemy engine, session, ORM models, SagaLogModel, field mapping utils

### Express Proxy (Development)
- `server/routes.ts` - Spawns uvicorn, proxies /api/* requests to FastAPI on port 8000
- `server/index.ts` - Express server entry point, serves Vite frontend + API proxy

## Microservice API Endpoints

### List Master Service (`/api/list-master/`)
Manages CRUD operations for network entries data.
- `GET /api/list-master` - List all entries
- `GET /api/list-master/:id` - Get single entry
- `POST /api/list-master` - Create entry
- `PATCH /api/list-master/:id` - Update entry
- `DELETE /api/list-master/:id` - Delete entry

### State Management Service (`/api/state/`)
Manages status transitions, validation, and transition history.
- `GET /api/state/flow` - Get status flow definition (7 steps)
- `GET /api/state/:entryId` - Get current status with step info
- `GET /api/state/:entryId/history` - Get transition history
- `POST /api/state/:entryId/transition` - Direct transition (bypasses saga — for simple cases)

### Lifecycle Service (`/api/lifecycle/`)
Computes lifecycle color flags, labels, and DOH values based on entry status. Read-only — no DB writes.
- `GET /api/lifecycle` - Get lifecycle data for all entries (batch map of entryId → flags)
- `GET /api/lifecycle/:entryId` - Get lifecycle data for single entry

### Saga Orchestrator (`/api/saga/`)
Coordinates multi-step workflows with compensation on failure.
- `POST /api/saga/transition/:entryId` - Execute status transition saga (4 steps: validate → record → update → recompute)
- `GET /api/saga/:sagaId` - Get saga execution log by ID
- `GET /api/saga/entry/:entryId` - Get all saga logs for an entry

### Legacy Endpoints (`/api/network-entries/`)
Same router as List Master, mounted at legacy path for backward compatibility.

## Saga Pattern

### Transition Saga (Draft → Active example)
```
Step 1: validate_transition   — State Management validates flow order + activation rules
Step 2: record_transition     — State Management writes audit trail (compensate: revert status)
Step 3: update_entry_status   — List Master updates networkStatus field (compensate: revert to previous)
Step 4: recompute_lifecycle   — Lifecycle recomputes flags (no compensation — read-only)
```
On failure at any step, compensating actions run in reverse order. All steps are logged to `saga_logs` table with full step details.

### Saga Statuses
- `pending` → `running` → `completed` (success)
- `pending` → `running` → `compensating` → `compensated` (failure with rollback)

## Database Tables
- `network_entries` — List Master service: all ~38 fields, UUID primary key, snake_case columns
- `entry_statuses` — State Management service: entry_id (UUID PK), current_status, updated_at
- `state_transitions` — State Management service: id (UUID PK), entry_id, from/to status, transition_date, triggered_by, metadata (JSONB), created_at
- `saga_logs` — Saga Orchestrator: id (string PK), saga_type, entry_id, status, steps (JSONB array), started_at, completed_at, error
- Field mapping between camelCase API and snake_case DB handled in `server_py/db.py`
- Auto-seeds 8 entries on first startup (covering all 7 statuses); skips if tables already populated

## Deployment Architecture
- Frontend: Separate Azure App Service (React/Vite build)
- Backend: Separate Azure App Service (Python/FastAPI via uvicorn)
- Database: Azure Database for PostgreSQL (or Docker PostgreSQL for local dev)
- Each microservice has its own tables in the same database
- Set DATABASE_URL env var for PostgreSQL connection
- Set VITE_API_BASE_URL env var to point frontend to backend URL

## Routes
- `/` - Dashboard with table and stats
- `/edit/:id` - Fullscreen edit page for an entry
