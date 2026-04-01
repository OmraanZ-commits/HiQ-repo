# Unilever Network Visibility Portal

## Overview
A central portal for managing network visibility across all Unilever product categories. Built with Unilever's brand identity (blue gradient header, Open Sans typography). Uses MVC architecture with a Python/FastAPI backend and Saga pattern for orchestrating multi-service workflows.

## Architecture

### Frontend (MVC)
- **Models**: `shared/schema.ts` (frontend types) + `server_py/models.py` (Pydantic models)
- **Views**: `client/src/components/` and `client/src/pages/` - React components
- **Controllers**: `client/src/controllers/` - Business logic hooks (useNetworkEntries, useNetworkEntryForm, useLifecycleData)
- **Lib/Utils**: `client/src/lib/` - Pure utility functions (date-utils, distribution-data, queryClient)

### Backend (Layered Microservices + Saga)
Each microservice follows: **Router → Service → Storage**
- **Router**: Thin HTTP layer (request parsing, response formatting, status codes). Zero business logic.
- **Service**: Business logic, validation, orchestration, compensating actions
- **Storage**: Database access only, no business logic
- **Saga Orchestrator**: Coordinates multi-step workflows across services with compensation on failure

All status transitions go exclusively through the Saga Orchestrator (`/api/saga/transition/{id}`). There is no direct transition endpoint on the State Management router.

## Tech Stack
- Frontend: React + TypeScript, Vite, TanStack Query, wouter routing, shadcn/ui
- Backend: Python 3.12 + FastAPI (uvicorn)
- Database: PostgreSQL via SQLAlchemy (Docker local / Azure PostgreSQL production)
- Proxy: Express.js serves Vite frontend and proxies /api/* to FastAPI in development
- Styling: Tailwind CSS with Unilever-branded color tokens (HSL 199 blue primary)
- Pattern: Orchestration-based Saga for multi-service transactions

## Key Features

### Dashboard
- **Two-tab dashboard**: Summary tab (default landing, analytics) and Network tab (data table)
- **Network tab**: Data table with CBU Created Date, Assigned Person columns, search, status filtering, and Trigger column
- **Summary tab** (analytics overview):
  - Gradient metric strip: Total / Draft / Active / NW Complete cards (each showing count + % of total)
  - Segmented pipeline bar with color-coded legend showing count + % per status
  - **Pending by Status** panel (left): ageing table with columns Status / Items / Avg Age / 7–30d / 1–3mo / >3mo; buckets are mutually exclusive based on `cbuCreatedDate` age; counts shown in amber/orange/red as urgency increases
  - **Pending by Assignee** panel (right): avatar initials, name, proportional bar, and bold pending count per person; sorted by pending count desc
  - Both panels displayed side-by-side in a 2-column grid
- Gradient stat cards (Total, Active, Draft, NW Complete)

### Edit Page
- Fullscreen edit page with tabbed form: Basic Info, Product Details, Dimensions, Distribution, Sourcing Matrix, Pricing
- Status flow progress bar (7 steps, color-coded by status)
- **Pricing tab**: Price lots displayed as `{CBU code}-{priceLot}` (e.g. "CBU123-01"); 4 scope types coexist simultaneously — All India, Region Specific, Channel Specific, Region×Channel matrix; states shown as compact wrapping blue-tinted badge pills; channels shown as amber badge pills; Region×Channel shown as a 2-column mini-table
- Distribution tab: Geography/Clusters card, Channels by Geography card (per-geography channel selection), Depots card, Distribution Matrix Preview
- Geo→Channel matrix table: rows = selected clusters, columns = GT | CSD | RD | MT (All + 4 sub-channels) | All; each cell is a checkbox per cluster×channel intersection
- Column header pills (row 1 for top-level channels, row 2 for MT sub-channels): clicking a header pill toggles that entire column across all selected clusters; pill shows filled (all), dash (partial), or empty ring (none) aggregate state
- MT column: two-row header — row 1 "MT" spans all sub-columns (label only), row 2 has individual pills for All + each MT sub-channel; clicking "All" in row 2 toggles all MT sub-channels
- Per-row "MT All" checkbox: each cluster row has a dedicated checkbox in the MT group to toggle all MT sub-channels for that single cluster
- `channelMapping` (JSONB): stores per-geography channel selections as `Record<string, string[]>`; flat `channel` array auto-derived as union for backward compatibility; leaf channel count = 8 (GT, CSD, RD, Ecom, KA, MT Retail, Qcom + one legacy)
- **Sourcing Matrix tab**: Decentralized / Centralized pill toggle
  - **Decentralized** (default): shows the distribution-selected clusters and depots pre-checked and read-only
  - **Centralized**: starts unselected; user manually picks from the same filtered cluster/depot list derived from the Distribution tab; switching back to Decentralized resets centralized selections
  - Validation: if geo selected in centralized mode with no depot for that geo → blocked with toast naming the offending geo; if zero total depots in centralized mode → blocked with toast; if user selects all available geos+depots → dialog prompts switch to Decentralized
  - State persisted in: `sourcingMode`, `centralizedGeo`, `centralizedDepots`
- View detail dialog with organized sections and status flow
- Year auto-calculated from CBU Created Date
- Network Change Date auto-calculated as CBU Created Date + 15 days for Draft entries
- Date validation: Change Date min = CBU+1 day, Start Date min = Change Date, End Date min = Start Date
- Draft→Active validation: requires all 3 dates + at least 1 cluster, depot, channel
- Confirmation dialog before activation showing: dates, predecessor/successor CBU, distribution matrix preview
- Assigned Person field with avatar initials in table
- Read-only fields for data-sourced values; editable fields for manual input
- No create new / delete entry actions (view + edit only)

### Platform
- **Saga-orchestrated status transitions**: Draft→Active goes through validate → record transition → update entry → recompute lifecycle, with automatic rollback on failure
- **Lifecycle color flags**: Amber (Production Started, FTR Approved), Red (Stock Movement Initiated), Blinking Red (Network transition complete) — shown in table Trigger column, edit page, detail dialog, and status flow
- Draft entries seed with blank start/end dates and empty distribution fields
- Configurable API base URL (VITE_API_BASE_URL) for separate frontend/backend deployment

## Status Flow
7-step progression exported as STATUS_FLOW constant (shared between frontend `shared/schema.ts` and backend `server_py/models.py`):
1. Draft
2. Active
3. Pricing Updated
4. Production Started
5. FTR Approved
6. Stock Movement Initiated
7. Network transition complete

## Data Model
`NetworkEntry` with ~38 fields covering:
- Basic info (CBU code, dates, annexure, network type, assigned person)
- Product details (brand, BG, format, profit centre, etc.)
- Dimensions (weight, length, width, height, EAN, ITF)
- Distribution (geography=18 Indian clusters, depot=24 depot codes, channel=9 channels with MT sub-channels, channelMapping=per-geography channel selections as JSONB)

## File Structure

### Frontend
- `client/src/controllers/useNetworkEntries.ts` - Dashboard controller hook
- `client/src/controllers/useNetworkEntryForm.ts` - Edit page controller hook (uses saga endpoint for activation)
- `client/src/controllers/useLifecycleData.ts` - Lifecycle data hook + flag class helpers
- `client/src/lib/date-utils.ts` - Date utility functions (addDays, formatDateDisplay, computeYear)
- `client/src/lib/distribution-data.ts` - Master data constants (clusters, depots, channels from Excel)
- `client/src/lib/queryClient.ts` - API client with configurable VITE_API_BASE_URL
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/pages/edit-entry.tsx` - Fullscreen edit page
- `client/src/components/unilever-header.tsx` - Branded header
- `client/src/components/stats-cards.tsx` - Gradient stat cards
- `client/src/components/status-flow.tsx` - 7-step status progress bar with lifecycle flag overlay
- `client/src/components/network-table.tsx` - Data table with Trigger column for lifecycle flags
- `client/src/components/entry-detail-dialog.tsx` - View details dialog with status flow and lifecycle info
- `client/src/components/people-picker.tsx` - Searchable people picker with avatars
- `shared/schema.ts` - Data model, types, and STATUS_FLOW constant

### Python Backend — Microservices (Router → Service → Storage)

#### List Master Service
- `server_py/services/list_master/router.py` - Thin HTTP layer, delegates all ops to ListMasterService
- `server_py/services/list_master/service.py` - Business logic: CRUD pass-through, update_status, compensate_status_update
- `server_py/services/list_master/storage.py` - PostgreSQL CRUD storage

#### State Management Service
- `server_py/services/state_management/router.py` - Read-only endpoints (flow, status, history). No transition endpoint — transitions go through saga.
- `server_py/services/state_management/service.py` - Business logic: validate_transition, record_transition, compensate_transition
- `server_py/services/state_management/storage.py` - PostgreSQL storage for statuses + transitions

#### Lifecycle Service
- `server_py/services/lifecycle/router.py` - Thin HTTP layer, delegates to LifecycleService
- `server_py/services/lifecycle/service.py` - Business logic: recompute_entry, recompute_all
- `server_py/services/lifecycle/engine.py` - Computation logic: maps status → colorFlag/flagLabel/urgencyLevel/doh

#### Saga Orchestrator
- `server_py/saga/base.py` - SagaOrchestrator base class + SagaStep: executes steps in order, compensates in reverse on failure, logs to saga_logs table
- `server_py/saga/transition_saga.py` - TransitionSaga: 4-step saga (validate → record transition → update entry → recompute lifecycle)
- `server_py/saga/router.py` - Saga API endpoints (execute transition, query saga logs)

#### Core
- `server_py/main.py` - FastAPI app entry point, CORS, router mounting, service wiring
- `server_py/seed_data.py` - Seed data for 8 network entries covering all 7 statuses
- `server_py/models.py` - Pydantic models (NetworkEntry, StateTransition, STATUS_FLOW)
- `server_py/db.py` - SQLAlchemy engine, session, ORM models, SagaLogModel, field mapping utils

### Express Proxy (Development)
- `server/routes.ts` - Spawns uvicorn, proxies /api/* requests to FastAPI on port 8000
- `server/index.ts` - Express server entry point, serves Vite frontend + API proxy

## Microservice API Endpoints

### List Master Service (`/api/list-master/`)
Manages CRUD operations for network entries data. All routes go through ListMasterService.
- `GET /api/list-master` - List all entries
- `GET /api/list-master/:id` - Get single entry
- `POST /api/list-master` - Create entry
- `PATCH /api/list-master/:id` - Update entry
- `DELETE /api/list-master/:id` - Delete entry

### State Management Service (`/api/state/`)
Read-only status queries and transition history. All mutations go through the Saga.
- `GET /api/state/flow` - Get status flow definition (7 steps)
- `GET /api/state/:entryId` - Get current status with step info
- `GET /api/state/:entryId/history` - Get transition history

### Lifecycle Service (`/api/lifecycle/`)
Computes lifecycle color flags, labels, and DOH values based on entry status. Read-only — no DB writes.
- `GET /api/lifecycle` - Get lifecycle data for all entries (batch map of entryId → flags)
- `GET /api/lifecycle/:entryId` - Get lifecycle data for single entry

### Saga Orchestrator (`/api/saga/`)
Coordinates multi-step workflows with compensation on failure. The sole path for status transitions.
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
- `network_entries` — List Master service: all ~39 fields (including `channel_mapping` JSONB), UUID primary key, snake_case columns
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

## Modules

### Network Planning (`/network`)
Full CRUD management of CBU entries — create, view, edit, and activate entries through the saga-orchestrated status flow. Accessible via the sidebar.

### Paid Bible (`/paid-bible`)
Read-only analytics view of basepacks and their CBUs, grouped by category. Key features:
- MOC badge (Month of Change): Day ≥ 21 → next month; Day < 21 → current month
- Active basepack count: calculated from `ACTIVE_BP_STATUSES = { "Active Pack", "Active Pack (Channel)", "Active Pack (Customer)", "Seasonal Pack" }`
- Sticky table header: `h-screen overflow-hidden` layout with `overflow-y-auto` on main
- View button in each expanded CBU row navigates to `/edit/:id?source=paid-bible&cbuStatus=<bpStatus>` (view-only mode)

### View-Only Mode (Edit Entry from Paid Bible)
When `?source=paid-bible` is present in the URL:
- Status progress bar is hidden
- Save button replaced with "Raise Amendment Request" (amber, outlined button)
- Amber banner shown: "View only — You are viewing this entry from the Paid Bible"
- Back button returns to `/paid-bible` instead of `/network`
- Info strip shows both Network Status and CBU Status (passed via `?cbuStatus=` query param)
- Toast fired on amendment request: "Amendment request raised. Network Planner will be notified."

## Routes
- `/` - Home landing page
- `/network` - Network Planning dashboard with data table and stats
- `/paid-bible` - Paid Bible analytics view
- `/edit/:id` - Fullscreen edit/view page for an entry; adds view-only behaviour when `?source=paid-bible`
