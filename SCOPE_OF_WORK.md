# Statement of Work — Scope Document
## Unilever Network Visibility Central Portal
### Modules: Network Planning · Admin Center

| | |
|---|---|
| **Prepared for** | Unilever |
| **Document version** | 1.0 |
| **Date** | April 2026 |
| **Status** | Draft for Review |

---

## 1. Purpose & Context

This document defines the functional and technical scope for two modules of the **Unilever Network Visibility Central Portal**: the **Network Planning** module and the **Admin Center** module. It is intended for use as an attachment to the Statement of Work (SoW) governing development, testing, and delivery of the portal.

The portal provides a unified interface for managing CBU (Consumer Business Unit) network entries across all Unilever Business Groups — from creation and planning through activation, production, and final network transition. The Admin Center governs portal access, user roles, and network entry ownership.

---

## 2. Module 1 — Network Planning (`/network`)

### 2.1 Overview

The Network Planning module is the primary operational workspace of the portal. It enables authorised users to view, edit, and progress CBU network entries through a defined seven-stage status workflow. All status transitions are saga-orchestrated to ensure data integrity with automatic rollback on failure.

### 2.2 User Roles (Module-Specific)

| Role | Access Level |
|---|---|
| **Network Planner** | Full edit rights on assigned entries; can activate Draft entries |
| **Category Manager** | View and edit access; can raise amendment requests |
| **Supply Chain Manager** | View and edit access; operational oversight |
| **Finance Manager** | View and edit access; pricing-related oversight |

### 2.3 Functional Scope

#### 2.3.1 Dashboard — Summary Tab

The default landing view of the module. Provides a real-time analytics overview of all network entries in the system.

- **Metric strip**: Four gradient stat cards displaying Total Entries, Draft count, Active count, and Network Transition Complete count; each card shows the count and its percentage of total.
- **Pipeline bar**: Horizontally segmented bar showing entry counts and percentages per status stage, color-coded by status.
- **Pending by Status panel**: Ageing table with columns — Status, Items, Avg Age (days), 7–30 days, 1–3 months, >3 months. Age buckets are mutually exclusive based on `CBU Created Date`. Urgency is colour-coded (amber → orange → red) as age increases.
- **Pending by Assignee panel**: Per-planner summary showing avatar initials, name, proportional progress bar, and pending entry count. Sorted descending by pending count. Both panels are displayed side-by-side in a two-column grid.

#### 2.3.2 Dashboard — Network Tab

Tabular view of all entries with the following capabilities:

- **Data columns**: CBU Created Date, CBU Code, Material Description, Business Group, Network Type, Assigned Person (with avatar initials), Network Status, Lifecycle Trigger flag.
- **Search**: Free-text search across CBU code, description, and assignee name.
- **Status filter**: Filter the table to one or more specific status stages.
- **Lifecycle Trigger column**: Visual flag indicator (amber, red, blinking red) showing urgency based on the current lifecycle stage of each entry.
- **Row action**: Click any row to open the full-screen edit/view page for that entry.

#### 2.3.3 Network Entry — View & Edit Page

A full-screen, tabbed form for managing a single CBU network entry. The page operates in two modes:

- **Edit mode**: All editable fields are active; actions depend on the current status of the entry.
- **View-only mode**: Activated when accessed from the Paid Bible module via `?source=paid-bible`; all fields are read-only and the activate button is replaced with "Raise Amendment Request".

The form is organised into six tabs:

**Tab 1 — Basic Info**

| Field | Type | Notes |
|---|---|---|
| CBU Created Date | Date (read-only) | System-sourced |
| Year | Integer (auto-calculated) | Derived from CBU Created Date |
| Network Change Date | Date | Auto-set to CBU Date + 15 days for Draft entries; min = CBU Date + 1 day |
| Start Date | Date | Min = Network Change Date |
| End Date | Date | Min = Start Date |
| Network Status | Text (read-only) | System-controlled |
| Update Assignee | People picker | Filtered to active Network Planners in the entry's Business Group; BG Lead indicated with a crown badge |
| Annexure Number | Text | |
| Type of Network | Select | |
| Predecessor CBU | Text | |
| Successor CBU | Text | |

**Tab 2 — Product Details**

| Field | Notes |
|---|---|
| Basepack | |
| Basepack Description | |
| Business Group | One of: Homecare, Personal Care, Foods, Beauty and Wellness, Others |
| Brand | |
| Format | |
| Profit Centre | |
| Sales Category | |
| Small C | |
| CBU Code | |
| Material Description | |
| Copy CBU | |
| Header Code | |
| CSD Index No. | |
| PC at Channel State | |

**Tab 3 — Dimensions**

| Field | Notes |
|---|---|
| EAN | |
| Net Weight | |
| Gross Weight | |
| Length / Width / Height | |
| ITF | |
| FTR Images Link | |
| Case Config | Editable; timestamp recorded on change |

**Tab 4 — Distribution**

The distribution tab captures the geographic and channel reach of the network entry.

- **Geography / Clusters**: 18 Indian geographic clusters; multi-select with "Select All" toggle.
- **Depots**: 24 depot codes; multi-select with "Select All" toggle; filtered to depots relevant to selected clusters.
- **Channels by Geography**: Per-geography channel selection enabling different channel mixes by cluster.
- **Geo → Channel Matrix**: Grid with rows = selected clusters, columns = GT | CSD | RD | MT (All + 4 sub-channels: Ecom, KA, MT Retail, Qcom) | All. Each cell is a checkbox. Column-header pills toggle the entire column across all clusters; aggregate states (all / partial / none) are shown visually. Stored as `channelMapping` JSONB field; a flat `channel` array is auto-derived for backward compatibility.

**Tab 5 — Sourcing Matrix**

Controls whether sourcing is centralised or decentralised.

- **Decentralised** (default): Distribution-selected clusters and depots are pre-populated as read-only.
- **Centralised**: User manually selects from the same cluster/depot pool. Switching back to Decentralised resets manual selections.
- **Validation rules**:
  - A selected geography with no depot assigned in centralised mode blocks submission.
  - Zero total depots in centralised mode blocks submission.
  - Selecting all available geographies and depots prompts the user to switch to Decentralised.

**Tab 6 — Pricing**

- Price lots displayed as `{CBU Code}-{Lot Number}` (e.g. `CBU123-01`).
- Four coexisting scope types: All India, Region Specific, Channel Specific, Region × Channel matrix.
- States shown as compact, wrapping badge pills (blue tint); channels shown as amber badge pills.
- Region × Channel shown as a two-column mini-table.
- `priceUpdatedAt` timestamp recorded when pricing data changes.

#### 2.3.4 Entry Actions

| Action | Condition | Behaviour |
|---|---|---|
| **Save Draft** | Entry is in Draft status | Saves all field changes directly via `PATCH /api/network-entries/:id`; bypasses activation validation; supports partial saves (e.g. assigning a planner without completing distribution) |
| **Submit & Activate** | Entry is in Draft status | Runs full validation (all three dates present, at least one cluster, one depot, one channel selected); on pass, shows confirmation dialog then triggers the saga-orchestrated Draft → Active transition |
| **Save** | Entry is in any non-Draft status | Saves field changes; does not trigger status transition |
| **Raise Amendment Request** | View-only mode (from Paid Bible) | Fires a notification toast; no state change |

#### 2.3.5 Activation Confirmation Dialog

Shown before the Draft → Active transition. Displays a pre-submission summary:

- Network Change Date, Start Date, End Date
- Predecessor CBU and Successor CBU
- Distribution matrix preview (clusters, depots, selected channels)

Admin must confirm before the saga is triggered.

#### 2.3.6 Status Workflow

The network entry progresses through seven ordered stages. All transitions are executed exclusively via the **Saga Orchestrator** (`POST /api/saga/transition/:entryId`). Direct status mutation is not permitted.

| Stage | Status |
|---|---|
| 1 | Draft |
| 2 | Active |
| 3 | Pricing Updated |
| 4 | Production Started |
| 5 | FTR Approved |
| 6 | Stock Movement Initiated |
| 7 | Network transition complete |

**Saga steps for each transition (4-step, with compensation):**

1. `validate_transition` — State Management validates flow order and activation rules.
2. `record_transition` — State Management writes the audit trail to `state_transitions`. *Compensation: revert the recorded transition.*
3. `update_entry_status` — List Master updates the `networkStatus` field on the entry. *Compensation: revert to previous status.*
4. `recompute_lifecycle` — Lifecycle service recomputes colour flags (read-only; no compensation needed).

On failure at any step, all completed steps are rolled back in reverse order. Every saga execution (success or failure) is logged in full to the `saga_logs` table.

#### 2.3.7 Lifecycle Flags

Colour-coded urgency indicators derived from the current status of each entry. Surfaced in the Network Table (Trigger column), the Edit Page status bar, the detail dialog, and the status flow progress bar.

| Trigger Condition | Flag |
|---|---|
| Production Started, FTR Approved | Amber |
| Stock Movement Initiated | Red |
| Network transition complete | Blinking Red |

#### 2.3.8 Status History

A complete, timestamped audit trail of every status transition is available per entry via `GET /api/state/:entryId/history`. Each record captures from-status, to-status, transition date, and triggering user.

### 2.4 Data Model

Each network entry (`NetworkEntry`) contains approximately 38 fields across four categories:

| Category | Key Fields |
|---|---|
| Identity & Dates | CBU Code, CBU Created Date, Network Change Date, Start Date, End Date, Year, Annexure Number, Network Status |
| Product | Basepack, Basepack Description, Business Group, Brand, Format, Profit Centre, Sales Category, Material Description, Copy CBU, Header Code |
| Dimensions | EAN, ITF, Net Weight, Gross Weight, Length, Width, Height, FTR Images Link, Case Config |
| Distribution | Geography (array), Depot (array), Channel (array), Channel Mapping (JSONB), Sourcing Mode, Predecessor/Successor CBU, Assigned Person |

### 2.5 API Surface — Network Planning

| Endpoint | Method | Description |
|---|---|---|
| `/api/network-entries` | GET | List all entries |
| `/api/network-entries/:id` | GET | Get single entry |
| `/api/network-entries/:id` | PATCH | Update entry fields |
| `/api/saga/transition/:id` | POST | Execute status transition (saga-orchestrated) |
| `/api/state/:id` | GET | Get current status and step info |
| `/api/state/:id/history` | GET | Get full transition history |
| `/api/lifecycle` | GET | Get lifecycle flags for all entries |
| `/api/lifecycle/:id` | GET | Get lifecycle flags for a single entry |

### 2.6 Out of Scope — Network Planning

The following items are explicitly excluded from this module's scope:

- Creation of new network entries from within the portal (entries are ingested from source systems)
- Deletion of network entries
- Bulk status transitions across multiple entries simultaneously
- Integration with external ERP or planning systems (SAP, etc.)
- Mobile-native application
- Offline / disconnected mode

---

## 3. Module 2 — Admin Center (`/admin`)

### 3.1 Overview

The Admin Center provides portal administrators with tools to manage user access, assign roles and Business Group affiliations, designate BG Leads, and maintain network entry ownership continuity when users are deactivated or reassigned.

### 3.2 Sub-Tabs

The Admin Center is organised into two sub-tabs accessible from the `/admin` route:

1. **User Management** — CRUD operations for portal users
2. **Roles & Permissions** — Read-only reference matrix showing capabilities per role

---

### 3.3 User Management

#### 3.3.1 User List & Filters

- Summary stats row: Total Users, Active count, Inactive count, Role count.
- **Role filter chips**: Clickable pill for each role to filter the user table.
- **Status filter**: Dropdown to show All / Active / Inactive users.
- **Search**: Free-text search across name, email, and Business Group.
- **User count indicator**: Shows "X of Y users" reflecting active filters.

#### 3.3.2 User Table

Each row in the user table displays:

| Column | Content |
|---|---|
| User | Avatar (initials), Full Name, Email |
| Role | Colour-coded badge |
| Business Group | BG name; BG Lead crown badge if applicable |
| Added | Formatted join date |
| Status | Active (green) / Inactive (grey) toggle button |
| Actions | Edit (pencil icon) |

#### 3.3.3 Add User

Admins can add a new portal user via a modal dialog. Fields:

| Field | Validation |
|---|---|
| Full Name | Required |
| Email Address | Required; valid email format |
| Role | Required; one of the four defined roles |
| Business Group | Required; one of the five defined BGs |
| BG Lead | Checkbox; visible only when Role = Network Planner |

On save, if the "BG Lead" checkbox is set and another Network Planner in the same BG is already the lead, a conflict confirmation dialog appears. On confirmation, the previous BG Lead is automatically demoted.

#### 3.3.4 Edit User

Admins can edit any existing user's Name, Email, Role, Business Group, and BG Lead status. The same BG Lead conflict resolution logic applies on save.

**Sensitive edit triggers** — When an admin saves an edit that meets any of the following conditions, the system checks whether the affected user has any incomplete network entries (entries with a status other than "Network transition complete"):

| Trigger | Condition |
|---|---|
| Role change | The user's current role is Network Planner and the new role is not Network Planner |
| Business Group change | The user is a Network Planner and their Business Group is being changed |

If incomplete entries are found, the **Network Reassignment Dialog** is shown before the edit is committed (see §3.4).

If no incomplete entries are found, the edit is applied immediately.

#### 3.3.5 Activate / Deactivate User

Clicking the status toggle on any user row switches their active state.

- **Activating** a user: applied immediately with no checks.
- **Deactivating a Network Planner**: the system checks for incomplete entries assigned to the user. If found, the **Network Reassignment Dialog** is shown (see §3.4) before deactivation is applied. If no incomplete entries exist, the user is deactivated immediately.
- Deactivating a user with a non-Network-Planner role: applied immediately with no checks.

---

### 3.4 Network Reassignment Dialog

Displayed whenever a user change would orphan one or more incomplete network entries. The dialog presents before the change is committed to state — cancelling it leaves the user's record unchanged.

#### 3.4.1 Trigger Conditions

| Trigger Label | Condition |
|---|---|
| Role Changed | NP role removed from a user who has incomplete entries |
| Business Group Changed | NP's BG changed; entries in the old BG are surfaced |
| User Deactivated | NP deactivated with incomplete entries remaining |

#### 3.4.2 Dialog Content

- **Header banner**: Amber/orange gradient; trigger label, description of the impact, and a live progress bar showing how many entries have been reassigned.
- **Affected entry count**: Total number of incomplete entries requiring reassignment.

#### 3.4.3 Reassignment Modes

**Bulk Assign mode (default)**

- A single planner dropdown to select one Network Planner.
- A scrollable preview list of all affected entries, each showing CBU code, status pill, material description, and the selected assignee chip once a planner is chosen.
- All entries are reassigned to the selected planner on confirmation.

**Assign Individually mode**

- A quick-fill strip at the top of the list allowing one planner to be applied to all entries in one click, after which individual entries can be overridden.
- A scrollable, numbered row table with one planner dropdown per entry. Each row shows a check / empty-circle indicator for assignment completion.
- Confirmation is disabled until every entry in the list has a planner selected.

#### 3.4.4 Available Planners

The planner dropdown is filtered to:
- Role = Network Planner
- Status = Active
- Business Group = the Business Group of the affected entries (i.e. the user's old BG)
- Excluding the user being changed

BG Lead planners are indicated with a crown icon in the dropdown.

#### 3.4.5 Dialog Actions

| Action | Behaviour |
|---|---|
| **Confirm & Reassign (N)** | PATCHes each entry's `assignedPerson` field via the API; then applies the pending user change (deactivation or edit). Disabled until all entries are assigned. |
| **Cancel** | Closes the dialog; the pending user change is **not** applied. User record remains unchanged. |

---

### 3.5 Roles & Permissions Matrix

A read-only reference tab showing which portal capabilities are available to each role. Covers:

- View network entries
- Edit network entry fields
- Activate entries (Draft → Active)
- Advance status beyond Active
- Raise amendment requests
- Manage users (Admin Center access)

---

### 3.6 Business Groups

Five Business Groups are defined across the portal:

1. Homecare
2. Personal Care
3. Foods
4. Beauty and Wellness
5. Others

### 3.7 User Roles

Four roles are defined:

1. **Network Planner** — Can be assigned as entry owner; eligible for BG Lead designation.
2. **Category Manager**
3. **Supply Chain Manager**
4. **Finance Manager**

### 3.8 BG Lead Designation

- One Network Planner per Business Group can be designated as BG Lead.
- BG Lead status is indicated with a crown badge in the user table, the people picker dropdown on entries, and the reassignment dialog.
- Changing BG Lead: if a BG Lead is already designated for a given BG, assigning a new one triggers a confirmation dialog. On confirmation, the previous BG Lead's status is automatically cleared.
- BG Lead status is automatically cleared when a user's role is changed away from Network Planner.

### 3.9 Out of Scope — Admin Center

- Single sign-on (SSO) or Active Directory integration
- Role-based row-level security on network entries in the database (currently handled at the UI layer)
- Audit log of admin actions (user create/edit/deactivate events)
- Self-service user registration or password management
- Bulk user import/export
- Email notifications to users on role or assignment changes

---

## 4. Technical Architecture

### 4.1 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query v5, wouter, shadcn/ui, Tailwind CSS |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Database | PostgreSQL (Azure Database for PostgreSQL in production) |
| ORM | SQLAlchemy |
| Dev proxy | Express.js (proxies `/api/*` to FastAPI; serves Vite frontend) |
| Hosting | Azure App Service (separate services for frontend and backend) |

### 4.2 Backend Architecture Pattern

Each backend microservice follows a strict **Router → Service → Storage** layering:

- **Router**: HTTP only — request parsing, response formatting, status codes. Zero business logic.
- **Service**: All business logic, validation, and orchestration.
- **Storage**: Database access only. No business logic.

Status transitions are exclusively handled by the **Saga Orchestrator**. No direct transition endpoint exists.

### 4.3 Database Tables

| Table | Owner Service | Description |
|---|---|---|
| `network_entries` | List Master | All ~39 entry fields; UUID PK; `channel_mapping` stored as JSONB |
| `entry_statuses` | State Management | Current status per entry |
| `state_transitions` | State Management | Full audit trail of all status changes |
| `saga_logs` | Saga Orchestrator | Full execution log per saga run (steps, timestamps, errors) |

### 4.4 Deployment

| Component | Environment |
|---|---|
| Frontend | Azure App Service; built with Vite; configured via `VITE_API_BASE_URL` |
| Backend API | Azure App Service; FastAPI via Uvicorn; configured via `DATABASE_URL` |
| Database | Azure Database for PostgreSQL |

---

## 5. Assumptions & Dependencies

1. Network entries are ingested from source systems (e.g. Excel, SAP extract) and loaded into the database prior to use. The portal does not create entries from scratch.
2. Master data (clusters, depots, channels, Business Groups) is maintained as configuration constants within the codebase. Updates require a code change and redeployment.
3. User management changes (add, edit, deactivate) are session-persisted only in the current implementation; backend persistence of user data is a future enhancement.
4. The Paid Bible module (out of scope for this document) feeds into the Network Planning module via a view-only link; its scope is covered separately.
5. Authentication and authorisation (login, session management, role enforcement at the API layer) are outside the scope of this document and are assumed to be handled by a separate identity layer or a future phase.
6. Email/push notifications triggered by workflow events (e.g. entry assigned, amendment request raised) are out of scope for this phase.

---

## 6. Acceptance Criteria Summary

| # | Criterion |
|---|---|
| AC-01 | All seven network status stages are visible in the status flow bar and pipeline summary. |
| AC-02 | Draft entries can be saved partially (Save Draft) without triggering activation validation. |
| AC-03 | Submit & Activate validates all three dates and at least one cluster, depot, and channel before triggering the saga. |
| AC-04 | Status transitions execute the four-step saga; on failure, all completed steps roll back automatically. |
| AC-05 | Lifecycle colour flags (amber, red, blinking red) appear in the table Trigger column, edit page, and detail dialog. |
| AC-06 | The Pending by Status ageing table correctly categorises entries into 7–30 day, 1–3 month, and >3 month buckets. |
| AC-07 | The Pending by Assignee panel reflects real-time entry assignments. |
| AC-08 | The Update Assignee picker filters to active Network Planners in the entry's Business Group only. |
| AC-09 | Deactivating a Network Planner with incomplete entries triggers the Reassignment Dialog before deactivation is applied. |
| AC-10 | Changing a Network Planner's role or Business Group with incomplete entries triggers the Reassignment Dialog before the change is applied. |
| AC-11 | Cancelling the Reassignment Dialog leaves the user record and all network entries unchanged. |
| AC-12 | Bulk Assign mode correctly PATCHes all listed entries to the selected planner on confirmation. |
| AC-13 | Individual Assign mode requires every entry to have a planner selected before the Confirm button is enabled. |
| AC-14 | BG Lead can only be designated for Network Planner role users; one per Business Group; changing it auto-demotes the previous lead. |
| AC-15 | View-only mode (from Paid Bible) hides all activation controls and displays the amber read-only banner. |

---

*End of Scope Document*
