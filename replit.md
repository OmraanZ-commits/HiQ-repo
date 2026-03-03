# Unilever Network Visibility Portal

## Overview
A central portal for managing network visibility across all Unilever product categories. Built with Unilever's brand identity (blue gradient header, Open Sans typography). Uses MVC architecture with a Python/FastAPI backend.

## Architecture (MVC)
- **Models**: `shared/schema.ts` (frontend types) + `server_py/models.py` (Pydantic models)
- **Views**: `client/src/components/` and `client/src/pages/` - React components
- **Controllers**: `client/src/controllers/` - Business logic hooks (useNetworkEntries, useNetworkEntryForm)
- **Backend**: Python/FastAPI microservices proxied through Express (dev) or standalone (production)

## Tech Stack
- Frontend: React + TypeScript, Vite, TanStack Query, wouter routing, shadcn/ui
- Backend: Python 3.12 + FastAPI (uvicorn)
- Database: PostgreSQL via SQLAlchemy (Replit dev / Docker local / Azure PostgreSQL production)
- Proxy: Express.js serves Vite frontend and proxies /api/* to FastAPI in development
- Styling: Tailwind CSS with Unilever-branded color tokens (HSL 199 blue primary)

## Key Features
- **Lifecycle color flags**: Amber (Production Started, FTR Approved), Red (Stock Movement Initiated), Blinking Red (CBU Ready for Transition / Ready for Transition) — shown in table, edit page, detail dialog, and status flow
- Dashboard with gradient stat cards (Total, Active, Draft, Production Started)
- Data table with CBU Created Date, Assigned Person columns, search, and status filtering
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
- `client/src/controllers/useNetworkEntryForm.ts` - Edit page controller hook
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/pages/edit-entry.tsx` - Fullscreen edit page
- `client/src/components/unilever-header.tsx` - Branded header
- `client/src/components/stats-cards.tsx` - Gradient stat cards
- `client/src/components/status-flow.tsx` - 7-step status progress bar
- `client/src/components/network-table.tsx` - Data table (view + edit actions, assigned person column)
- `client/src/components/entry-detail-dialog.tsx` - View details dialog with status flow
- `client/src/components/people-picker.tsx` - Searchable people picker with avatars
- `client/src/lib/distribution-data.ts` - Master data constants (clusters, depots, channels from Excel)
- `client/src/lib/queryClient.ts` - API client with configurable VITE_API_BASE_URL
- `shared/schema.ts` - Data model, types, and STATUS_FLOW constant

### Python Backend
- `server_py/main.py` - FastAPI app entry point, CORS, router mounting, seed data, table creation on startup
- `server_py/models.py` - Pydantic models (NetworkEntry, StateTransition, STATUS_FLOW)
- `server_py/db.py` - SQLAlchemy engine, session, ORM models (NetworkEntryModel, EntryStatusModel, StateTransitionModel), field mapping utils
- `server_py/services/list_master/storage.py` - PostgreSQL CRUD storage for network entries
- `server_py/services/list_master/router.py` - FastAPI router for List Master
- `server_py/services/state_management/storage.py` - PostgreSQL storage for statuses + transitions
- `server_py/services/state_management/router.py` - FastAPI router for State Management

### Lifecycle Service
- `server_py/services/lifecycle/engine.py` - Computation logic: maps status → colorFlag/flagLabel/urgencyLevel/doh
- `server_py/services/lifecycle/router.py` - FastAPI router for lifecycle data (GET /api/lifecycle, GET /api/lifecycle/:id)
- `client/src/controllers/useLifecycleData.ts` - Frontend hook + helper for lifecycle flag classes

### Express Proxy (Development)
- `server/routes.ts` - Spawns uvicorn, proxies /api/* requests to FastAPI on port 8000
- `server/index.ts` - Express server entry point, serves Vite frontend + API proxy
- `server/storage.ts` - Minimal user storage (auth placeholder)

## Microservice Architecture (Python/FastAPI)

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
- `POST /api/state/:entryId/transition` - Transition status (validates rules, e.g. Draft→Active requires dates + distribution)

### Lifecycle Service (`/api/lifecycle/`)
Computes lifecycle color flags, labels, and DOH values based on entry status. Read-only — no DB writes.
- `GET /api/lifecycle` - Get lifecycle data for all entries (batch map of entryId → flags)
- `GET /api/lifecycle/:entryId` - Get lifecycle data for single entry

### Legacy Endpoints (`/api/network-entries/`)
Same router as List Master, mounted at legacy path for backward compatibility.

## Database Tables
- `network_entries` — List Master service: all ~38 fields, UUID primary key, snake_case columns
- `entry_statuses` — State Management service: entry_id (UUID PK), current_status, updated_at
- `state_transitions` — State Management service: id (UUID PK), entry_id, from/to status, transition_date, triggered_by, metadata (JSONB), created_at
- Field mapping between camelCase API and snake_case DB handled in `server_py/db.py`
- Auto-seeds 5 entries on first startup; skips if tables already populated

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
