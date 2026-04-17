# Unilever Network Visibility Portal

The Unilever Network Visibility Portal is a central application designed to manage and provide visibility into network changes across all Unilever product categories. Its primary purpose is to streamline the lifecycle of network entries, from initial drafting and activation through various stages of production and network transition. The portal aims to improve data consistency, facilitate multi-step approval workflows, and offer comprehensive analytics for supply chain and product management. Key capabilities include:

- **Network Entry Management:** Full CRUD operations for network entries, including fields for basic info, product details, dimensions, distribution (geography, depot, channel, `channelMapping` JSONB), and sourcing matrix.
- **Saga-orchestrated Status Transitions:** A 7-step status flow (Draft, Active, Pricing Updated, Production Started, FTR Approved, Stock Movement Initiated, Network transition complete) managed by a Saga Orchestrator for multi-step, transactional updates with automatic rollback on failure.
- **Lifecycle Management:** Automated computation and display of lifecycle color flags (Amber, Red, Blinking Red) and urgency levels based on entry status, visible in tables, edit pages, and detail dialogs.
- **Dashboard:** Provides a two-tab view: a Summary tab with analytics (total, draft, active, NW complete counts and percentages, pending items by status and assignee) and a Network tab for detailed data display with search and filtering.
- **Edit Page Functionality:** Tabbed interface for editing various aspects of a network entry, including detailed configuration for pricing lots, distribution matrices (geo-channel mapping), and sourcing modes (Decentralized/Centralized). Includes robust date validation and activation confirmation dialogs.
- **Paid Bible Module:** Manages basepack analytics and status. Features an Overview tab with inline status editing, an Activation Check dialog with MSTN coverage evaluation, and a unified Service Requests tab.
- **Unified Service Requests (SR) Model:** Consolidates four types of service requests (Basepack Status Change, CBU Geo Extension, CBU Channel Extension, CBU Sourcing Amendment) under a single model with common ID format (`SR-XXXXXX`), approval chains, and a unified UI for listing and detail viewing.
- **User Management (Admin Center):** Allows management of portal users, roles (Admin, Network Planner, Paid Bible Owner, etc.), and business groups. Includes functionality for designating Business Group Leads and handling reassignment of network entries upon role changes, BG changes, or user deactivation.
- **View-Only Mode:** Provides a restricted view of network entries when accessed from specific contexts (e.g., Paid Bible), replacing edit controls with a "Raise Amendment Request" button and displaying an amber banner.

The project vision is to enhance operational efficiency and strategic decision-making by offering a unified platform for network visibility.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes. I value clear, concise communication and seeing documentation updated alongside code changes. Do not make changes to files within the `shared/` directory unless absolutely necessary and explicitly approved.

## System Architecture

### Core Architectural Patterns
- **MVC (Model-View-Controller) for Frontend**:
    - **Models**: `shared/schema.ts` (frontend types) and `server_py/models.py` (Pydantic models for backend).
    - **Views**: React components in `client/src/components/` and `client/src/pages/`.
    - **Controllers**: React hooks in `client/src/controllers/` encapsulate business logic.
- **Layered Microservices for Backend**: Each microservice (List Master, State Management, Lifecycle, Users) follows a strict `Router → Service → Storage` pattern to ensure separation of concerns.
    - **Router**: Thin HTTP layer, no business logic.
    - **Service**: Contains business logic, validation, and orchestration.
    - **Storage**: Handles database access exclusively, no business logic.
- **Saga Orchestration Pattern**: Utilized for managing complex, multi-step distributed transactions across microservices, ensuring atomicity and providing compensation mechanisms for failures. The Saga Orchestrator is the sole entry point for status transitions.

### Technical Implementations and Design Choices
- **Frontend Stack**: React, TypeScript, Vite, TanStack Query, wouter for routing, and shadcn/ui for components.
- **Backend Stack**: Python 3.12 with FastAPI (uvicorn) for high performance and asynchronous operations.
- **Database**: PostgreSQL, accessed via SQLAlchemy, supporting both local Docker environments and Azure PostgreSQL for production.
- **Styling**: Tailwind CSS, incorporating Unilever's brand identity with specific color tokens (HSL 199 blue primary).
- **Branding**: Unilever's brand identity is maintained through UI elements like a blue gradient header and Open Sans typography.
- **Unified Data Model**: Consolidation of Amendment and Service Request entities into a single `ServiceRequest` model (`sr-store.ts`) to simplify management and UI.
- **Status Flow**: A 7-step status progression (`STATUS_FLOW`) is consistently used across frontend and backend, with color-coded lifecycle flags (Amber, Red, Blinking Red) indicating urgency and status.
- **Distribution Matrix**: Complex geo-to-channel matrix table in the Edit page, allowing detailed configuration of product distribution, with JSONB storage for `channelMapping`.
- **Sourcing Matrix**: Toggle between Decentralized (distribution-driven) and Centralized (manual selection) sourcing modes, with associated validation rules.
- **Dashboard Analytics**: Features a two-tab dashboard with a summary view (gradient metric strip, segmented pipeline bar, pending by status/assignee panels) and a network data table.
- **User Management**: Persistent user data managed by the Users microservice, with atomic updates for roles and business group leads, including automatic reassignment workflows for Network Planners.
- **Paid Bible Module Features**:
    - **MSTN & DOH Monitoring**: Daily DOH file ingestion, SLOB risk recomputation, and monthly MSTN checks with alerts.
    - **Activation Check Dialog**: Intercepts status changes to "Active Pack," evaluates MSTN coverage, and always initiates a Service Request for tracking.
    - **Raise Amendment Request Flow**: A guided 3-step interactive dialog for CBU-level service requests (Geo/Channel Extension, Sourcing Amendment), adapting the UI based on the request type.
- **Seed Data**: `main.py` is kept lean — seed data lives in dedicated scripts (`seed_data.py`, `seed_reference_data.py`, `seed_users.py`), keeping `main.py` focused on app initialization, router mounting, and service wiring.
- **In-Memory Store Overrides**: `sr-store.ts` maintains module-level `_channelOverrides` and `_sourcingOverrides` maps that are applied immediately upon SR approval, before any backend persistence, to give instant UI feedback. These drive `effectiveChannels` / `effectiveChannelMapping` in the edit page.
- **Notification System**: `notification-store.ts` implements a lightweight pub/sub pattern (module-level array + `_listeners` Set) for approval confirmations. The Bell icon in the header shows a 3-state badge (orange count / grey dot / hidden). Clicking navigates to `/notifications`. My Queue (`/my-queue`) is a separate placeholder for future pending-approvals workflow.
- **Utility Library**: Pure date helpers (`addDays`, `formatDateDisplay`, `computeYear`) live in `client/src/lib/date-utils.ts` — not in controllers — ensuring controllers contain only business logic hooks.

### File Structure and Modularity
- **Frontend**: Organized into `controllers/` (headless business-logic hooks), `components/` (UI), `pages/` (route-level views), `lib/` (pure utilities: `date-utils.ts`, `sr-store.ts`, `notification-store.ts`, `queryClient.ts`), and `shared/` (common types).
- **Backend**: Microservices structured by domain under `server_py/services/`, each containing `router.py` (thin HTTP), `service.py` (business logic), and `storage.py` (DB access only). Core components (`main.py`, `models.py`, `db.py`) handle app initialization, data models, and database interactions. All status transitions must go through `/api/saga/transition/{id}` — there is no direct transition endpoint.

## External Dependencies
- **Frontend:** React, TypeScript, Vite, TanStack Query, wouter, shadcn/ui, Tailwind CSS.
- **Backend:** Python 3.12, FastAPI, uvicorn.
- **Database:** PostgreSQL (Docker for local, Azure Database for PostgreSQL for production) via SQLAlchemy.
- **Proxy (Development):** Express.js for serving the Vite frontend and proxying API requests to FastAPI.
