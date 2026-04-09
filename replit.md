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

### Verified Clean Layered Architecture (T001–T005)
- **List Master router**: Zero direct storage calls — all CRUD delegated to `ListMasterService`
- **State Management router**: Read-only only (`GET /flow`, `GET /:id`, `GET /:id/history`); no `POST` transition endpoint
- **Lifecycle router**: Fully delegates to `LifecycleService.recompute_entry()` / `recompute_all()`
- **Seed data**: Extracted from `main.py` into `server_py/seed_data.py`; `main.py` is ≤ 100 lines
- **Date utilities**: `addDays`, `formatDateDisplay`, `computeYear` live in `client/src/lib/date-utils.ts`; controllers import from there

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
- `client/src/components/people-picker.tsx` - Searchable people picker with avatars (accepts `bg` prop to filter to NPs in a BG)
- `client/src/components/reassignment-dialog.tsx` - Bulk/individual reassignment dialog shown on NP role-change, BG-change, or deactivation
- `client/src/lib/users-data.ts` - Portal user registry (PORTAL_USERS, BUSINESS_GROUPS, ROLES constants + networkPlannersForBg helper)
- `client/src/lib/amendment-store.ts` - Module-level amendment SR store (addAmendment, approveAmendmentStep, rejectAmendmentStep, useAmendmentStore hook)
- `client/src/components/raise-amendment-dialog.tsx` - Dialog for raising CBU-level amendment requests (type → current/requested values → justification → submit)
- `client/src/pages/amendment-detail.tsx` - Amendment SR detail page with Overview + Approval Chain tabs
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

#### Users Service
- `server_py/services/users/router.py` - Thin HTTP layer: GET /api/users, GET /api/users/:id, POST, PATCH
- `server_py/services/users/service.py` - Pass-through to storage
- `server_py/services/users/storage.py` - PostgreSQL CRUD; PATCH with isBgLead=True auto-demotes existing BG Lead in same BG

#### Core
- `server_py/main.py` - FastAPI app entry point, CORS, router mounting, service wiring
- `server_py/seed_data.py` - Seed data for 8 network entries covering all 7 statuses
- `server_py/seed_users.py` - Seed data for 17 portal users across 9 roles (email-based upsert, safe to re-run)
- `server_py/models.py` - Pydantic models (NetworkEntry, StateTransition, STATUS_FLOW)
- `server_py/db.py` - SQLAlchemy engine, session, ORM models (including UserModel), field mapping utils

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

### Users Service (`/api/users/`)
Manages portal users with full persistence. Role and BG Lead changes are applied atomically.
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user (auto-demotes previous BG Lead if isBgLead=true)
- `PATCH /api/users/:id` - Update user fields (auto-demotes previous BG Lead if isBgLead=true; auto-clears isBgLead if role changed away from Network Planner)

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
- `users` — Users service: id (UUID PK), name, email, role, business_group, is_bg_lead, is_active, created_at
- Field mapping between camelCase API and snake_case DB handled in `server_py/db.py`
- Auto-seeds 8 network entries and 17 users on first startup; skips if tables already populated (email-based upsert — safe to re-run)

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

#### Save Draft vs Submit & Activate
Draft-status entries show two separate action buttons:
- **Save Draft** (outline) — calls `PATCH /api/network-entries/:id` directly, bypasses activation validation; allows partial saves (e.g. assigning a Network Planner)
- **Submit & Activate** (filled) — runs full validation (dates, geo, depot, channels) then triggers the saga transition from Draft → Active

#### Edit Entry — Update Assignee field
In the Dates & Timeline section the field formerly labeled "Network Planner" is labeled **"Update Assignee"**. It filters available planners to the entry's Business Group.

### Paid Bible (`/paid-bible`)
Analytics and status management for basepacks and their CBUs, grouped by category. Five tabs:

#### Overview Tab
- Basepack table with status badges; inline status editing (Draft → Active Pack) triggers the Activation Check flow
- Active basepack count: calculated from `ACTIVE_BP_STATUSES = { "Active Pack", "Active Pack (Channel)", "Active Pack (Customer)", "Seasonal Pack" }`
- MOC badge (Month of Change): Day ≥ 21 → next month; Day < 21 → current month
- Sticky table header: `h-screen overflow-hidden` layout with `overflow-y-auto` on main
- View button in each expanded CBU row navigates to `/edit/:id?source=paid-bible&cbuStatus=<bpStatus>` (view-only mode)

#### Activation Check Dialog (Draft → Active Pack)
- Intercepts any non-Active-Pack → Active Pack status change in the Overview table (not limited to Draft; allows re-activation from Seasonal, Stock Base Delisting, etc.)
- Computes MSTN coverage only (≥ 80% threshold); TDP is not shown or evaluated in the dialog
- Single MSTN Coverage card with pass/fail colour coding
- Shows per-material table: Code, Description, MSTN Cleared (icon), Last Updated
- Always raises a Service Request regardless of whether criteria are met; criteria-met requests show emerald button, criteria-not-met show amber button
- `localBpStatus` state lifted to `PaidBiblePage` so status changes persist across tab switches

#### Amendments Tab
- Lists all CBU-level amendment requests raised from the edit-entry page (paid bible view)
- Amendment types: Geo Extension, Channel Extension, Sourcing Amendment
- Each card shows: SR ID, amendment type badge (colour-coded per type), CBU code/description, status badge (pending/approved/rejected), current→requested change summary, raised-by/raised-at, 3-step approval progress bar
- Type and status filters at top; empty state with usage hint
- Click "View Details" → `/paid-bible/amendments/:id` (AmendmentDetailPage)
- Approval chain: Paid Bible Owner (PBO Review) → Network Planner (Field Verification) → NCSM (Final Approval)
- Workflow info card at bottom explaining that NCSM approval is required before Paid Bible Matrix is updated

#### Raise Amendment Request Flow
- Triggered from the "Raise Amendment Request" button on the edit-entry page (paid bible view-only mode)
- Dialog (`RaiseAmendmentDialog`): select amendment type → fill in current value + requested value (labels adapt per type) → business justification → submit
- On submit: creates `AmendmentRequest` in `useAmendmentStore`, navigates to `/paid-bible?tab=amendments`, shows toast
- Approver chain is built at creation time by querying live users: first active PBO + NP matching assignedPerson (or any active NP) + first active NCSM

#### Amendment Detail Page (`/paid-bible/amendments/:id`)
- Overview tab: amendment summary, current→requested comparison table, justification, approval progress bar
- Approval Chain tab: same `ApproverChain` component as SR detail; Approve/Reject buttons with reason codes
- Back button → `/paid-bible?tab=amendments`; header tabs navigate to the correct paid-bible tab

#### Service Requests Tab
- Lists all basepack status-change approval tickets (type: `ServiceRequest`)
- Each card shows: SR id, request type, status badge, basepack name/code, raised-by, raised-at, MSTN coverage pill, Criteria Met/Not Met pill, Target Status, approval progress, 5-step approver chain
- **Approval chain**: 5 sequential steps — Demand Planner → Supply Planner → Distribution Planner → Network Planner → NCSM
- Each step has status: `waiting | pending | approved | rejected`; on full approval `localBpStatus[bpId]` flips to `targetStatus`
- Each step shows the assigned user name ("Assigned to: [name]"), fetched live from `/api/users`
- Rejection requires selecting a reason code (6 predefined); downstream steps reset to `waiting` on reject
- Rejection reasons: Insufficient MSTN coverage, TDP estimates not built, Production capacity, Logistics routing, Price activation pending, Other

### View-Only Mode (Edit Entry from Paid Bible)
When `?source=paid-bible` is present in the URL:
- Status progress bar is hidden
- Save button replaced with "Raise Amendment Request" (amber, outlined button)
- Amber banner shown: "View only — You are viewing this entry from the Paid Bible"
- Back button returns to `/paid-bible` instead of `/network`
- Info strip shows both Network Status and CBU Status (passed via `?cbuStatus=` query param)
- Toast fired on amendment request: "Amendment request raised. Network Planner will be notified."

### Admin Center (`/admin`)
Admin portal with two sub-tabs:

#### User Management
- Manage portal users with 9 roles: Admin, Network Planner, Paid Bible Owner, Demand Planner, Supply Planner, Distribution Planner, NCSM, Approver, Viewer
- **Business Groups**: Homecare, Personal Care, Foods, Beauty and Wellness, Others
- **BG Lead**: A Network Planner can be designated BG Lead for their Business Group (one per BG). Changing this auto-demotes the previous lead (after an AlertDialog confirmation).
- Stats row: Total Users, Active, Inactive, Roles count

**User edit triggers that check for reassignment:**
Three events prompt the Reassignment Required dialog if the user is a Network Planner with incomplete assigned entries:
1. **Role changed away from Network Planner** (`trigger: "role-change"`)
2. **Business Group changed** (`trigger: "bg-change"`) — entries in the OLD BG are surfaced
3. **User deactivated** (`trigger: "deactivation"`)

The **ReassignmentDialog** (`components/reassignment-dialog.tsx`) presents:
- Count of affected incomplete entries (all except "Network transition complete")
- **Bulk mode**: pick one Network Planner → reassign all
- **Individual mode**: pick a different planner per entry; quick-fill "Apply to all" shortcut
- **Confirm & Reassign**: PATCHes each entry's `assignedPerson` via API, then applies the user change
- **Cancel**: closes the dialog without applying the pending user change — user record and all assignments stay unchanged
- Available planners: active NPs in the same BG as the affected entries, excluding the user themselves

#### Roles & Permissions
Read-only matrix showing what each role can do.

## User Registry
User data is persisted in the `users` PostgreSQL table via the Users microservice. The frontend always reads from `/api/users`.

`client/src/lib/users-data.ts` provides shared TypeScript types and constants only:
- `PORTAL_USERS`: static seed reference (not used in UI — kept for type reference)
- `BUSINESS_GROUPS`: 5 values constant (used by UI forms and filters)
- `ROLES`: role values constant (used by UI forms and filters)
- `PortalUser` type: id, name, email, role, businessGroup, isBgLead, isActive, createdAt
- `networkPlannersForBg(bg)`: utility (legacy — filtering now done from live API data)

## Routes
- `/` - Home landing page
- `/network` - Network Planning dashboard with data table and stats
- `/paid-bible` - Paid Bible analytics view
- `/admin` - Admin Center (User Management + Roles & Permissions)
- `/edit/:id` - Fullscreen edit/view page for an entry; adds view-only behaviour when `?source=paid-bible`
