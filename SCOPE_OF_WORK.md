# Functional Scope — Statement of Work
## Unilever Network Visibility Central Portal
### Modules in Scope: Network Planning · Admin Center

| | |
|---|---|
| **Prepared for** | Unilever |
| **Document version** | 1.0 |
| **Date** | April 2026 |
| **Status** | Draft for Review |

---

## 1. Background & Purpose

The **Unilever Network Visibility Central Portal** is an internal web application providing a single workspace for managing CBU (Consumer Business Unit) network entries across all Unilever Business Groups. It replaces fragmented spreadsheet-based processes with a governed, workflow-driven system covering planning, activation, production tracking, and final network transition.

This document defines the **functional scope** for two of the portal's three modules:

- **Network Planning** — the primary operational workspace for managing network entries through their full lifecycle.
- **Admin Center** — the governance workspace for managing portal users, roles, and network entry ownership.

The third module, **Paid Bible**, is outside the scope of this document.

---

## 2. User Roles

Four roles are defined across the portal. All roles can view and edit network entries; role distinctions govern specific capabilities such as activation and user administration.

| Role | Description |
|---|---|
| **Network Planner** | Primary owner of network entries. Can be assigned to individual entries and designated as BG Lead for their Business Group. |
| **Category Manager** | Collaborates on network planning. Can view entries and raise amendment requests from the Paid Bible. |
| **Supply Chain Manager** | Operational oversight role. Views and edits entries relevant to supply chain activities. |
| **Finance Manager** | Financial oversight role. Views and edits entries relevant to pricing and financial planning. |

---

## 3. Business Groups

Five Business Groups are supported across the portal:

1. Homecare
2. Personal Care
3. Foods
4. Beauty and Wellness
5. Others

Every network entry and every Network Planner belongs to exactly one Business Group.

---

## 4. Module 1 — Network Planning

### 4.1 Overview

The Network Planning module allows authorised users to track, edit, and progress CBU network entries from initial planning through to final network transition. It is the primary day-to-day workspace for Network Planners and other stakeholders.

---

### 4.2 Dashboard

The module opens on a two-tab dashboard.

#### 4.2.1 Summary Tab (default)

The Summary tab gives a real-time snapshot of all network entries across the system.

**Metric Cards**

Four headline figures are displayed at the top of the page:

- Total entries in the system
- Entries currently in Draft status
- Entries currently in Active status
- Entries that have reached Network Transition Complete

Each card shows the count and its percentage of the total.

**Pipeline Bar**

A horizontal segmented bar visualises the distribution of entries across all seven status stages, with count and percentage for each stage. This gives a quick picture of where the overall pipeline is concentrated.

**Pending by Status — Ageing Panel**

A table showing how long entries have been sitting at each status stage. Columns:

| Column | Description |
|---|---|
| Status | The status stage |
| Items | Number of entries currently at this stage |
| Avg Age | Average age in days since CBU Created Date |
| 7–30 days | Count of entries aged between 7 and 30 days |
| 1–3 months | Count of entries aged between 1 and 3 months |
| >3 months | Count of entries aged more than 3 months |

Urgency is colour-coded: amber for 7–30 days, orange for 1–3 months, red for over 3 months. Entries at "Network transition complete" are excluded from this panel.

**Pending by Assignee Panel**

A list showing each Network Planner's outstanding workload. For each planner:

- Avatar with initials
- Full name
- Proportional bar showing their share of pending entries
- Bold count of pending entries assigned to them

The list is sorted descending by pending entry count.

Both the Ageing and Assignee panels sit side-by-side on the same row.

#### 4.2.2 Network Tab

A full data table of all entries in the system. Provides the following:

- **Search**: Free-text search across CBU code, material description, and assigned person.
- **Status filter**: Narrow the table to one or more specific status stages.
- **Columns**: CBU Created Date, CBU Code, Material Description, Business Group, Type of Network, Assigned Person (with avatar initials), Network Status, and a Lifecycle Trigger flag column (see §4.5).
- **Row click**: Opens the full edit/view page for that entry.

---

### 4.3 Network Entry — Edit Page

Clicking any entry from the Network tab opens a dedicated full-screen edit page. The page is organised into six tabs covering all aspects of the entry.

#### 4.3.1 Status Flow Bar

At the top of every edit page a progress bar shows the entry's position across the seven status stages, colour-coded to the current status. The bar also surfaces any active lifecycle flag for the entry.

#### 4.3.2 Tab 1 — Basic Info

Contains identity, timing, and ownership fields.

| Field | Behaviour |
|---|---|
| CBU Created Date | Read-only; sourced from the originating system |
| Year | Auto-calculated from CBU Created Date; read-only |
| Network Change Date | Editable; auto-set to CBU Date + 15 days for Draft entries; minimum value is CBU Date + 1 day |
| Start Date | Editable; minimum value is Network Change Date |
| End Date | Editable; minimum value is Start Date |
| Network Status | Read-only; controlled by the status workflow |
| Update Assignee | Searchable picker showing active Network Planners in the entry's Business Group; BG Lead planners are marked with a crown icon |
| Annexure Number | Editable text |
| Type of Network | Editable select |
| Predecessor CBU | Editable text |
| Successor CBU | Editable text |
| Copy CBU | Editable text |
| Header Code | Editable text |
| CSD Index No. | Editable text |
| PC at Channel State | Editable text |
| Sourcing Matrix Section | Editable text |

#### 4.3.3 Tab 2 — Product Details

Contains product classification fields sourced at entry creation: Basepack, Basepack Description, Business Group, Brand, Format, Profit Centre, Sales Category, Small C, CBU Code, and Material Description. Fields are read-only where sourced from upstream systems; editable where manually maintained.

#### 4.3.4 Tab 3 — Dimensions

Physical specification fields: EAN, ITF, Net Weight, Gross Weight, Length, Width, Height, FTR Images Link, and Case Config. A timestamp is recorded automatically whenever Case Config is updated.

#### 4.3.5 Tab 4 — Distribution

Captures the geographic and channel reach of the network entry.

**Geography / Clusters**

A multi-select list of 18 Indian geographic clusters. A "Select All" toggle is available. Selected clusters drive what is available in the Sourcing Matrix tab.

**Depots**

A multi-select list of 24 depot codes. Filtered to depots relevant to the selected clusters. A "Select All" toggle is available.

**Channels by Geography**

Per-geography channel selection, allowing different channel mixes to be defined per cluster rather than applying a single global channel set.

**Geo → Channel Matrix**

A grid summarising the distribution setup:

- Rows represent selected geographic clusters.
- Columns represent trade channels: GT, CSD, RD, and MT (with sub-channels: All, Ecom, KA, MT Retail, Qcom).
- Each cell is a checkbox for that cluster × channel combination.
- Clicking a column header pill toggles the entire column across all clusters at once. The pill shows a filled, dash, or empty-ring state to indicate all / partial / none selection.
- Each cluster row has a dedicated "MT All" checkbox to toggle all MT sub-channels for that cluster only.

#### 4.3.6 Tab 5 — Sourcing Matrix

Controls whether the sourcing configuration is decentralised or centralised.

**Decentralised (default)**
The clusters and depots selected in the Distribution tab are pre-populated as read-only. No further action required.

**Centralised**
The planner manually selects from the same cluster/depot pool derived from the Distribution tab. Selections start empty and are built manually.

Switching back from Centralised to Decentralised clears all manual centralised selections.

**Validation rules for Centralised mode:**
- If a geography is selected with no depot assigned for that geography, the entry cannot be saved; a message identifies the offending geography.
- If the total number of selected depots is zero, the entry cannot be saved.
- If all available geographies and depots are selected, the system prompts the user to switch back to Decentralised mode.

#### 4.3.7 Tab 6 — Pricing

Displays pricing lots associated with the entry. Each lot is identified as `{CBU Code}-{Lot Number}`. Four pricing scope types can coexist on the same entry simultaneously:

- **All India** — pricing applicable nationally
- **Region Specific** — pricing scoped to named regions
- **Channel Specific** — pricing scoped to named channels
- **Region × Channel** — pricing at the intersection of a specific region and channel

States (geographic applicability) are shown as blue badge pills. Channels are shown as amber badge pills. Region × Channel pricing is displayed as a two-column reference table. A timestamp is recorded automatically whenever pricing data is updated.

---

### 4.4 Entry Actions

#### Save Draft

Available when the entry is in **Draft** status.

Saves all current field changes immediately without running any activation validation. This allows a planner to make partial updates — such as assigning a Network Planner, filling in product details, or updating dimensions — before the entry is ready to activate. The entry remains in Draft.

#### Submit & Activate

Available when the entry is in **Draft** status.

Before activating, the system validates:

1. Network Change Date, Start Date, and End Date are all populated.
2. At least one cluster is selected.
3. At least one depot is selected.
4. At least one channel is selected.

If validation passes, a confirmation dialog is shown summarising:
- Network Change Date, Start Date, End Date
- Predecessor and Successor CBU
- A preview of the selected distribution (clusters, depots, channels)

The planner must confirm before the transition is triggered. On confirmation the entry moves to **Active** status.

If validation fails, a toast message identifies the missing data. The entry remains in Draft.

#### Save (non-Draft entries)

Available for entries in any status other than Draft. Saves field changes to the entry without changing its status.

#### Raise Amendment Request

Available in **view-only mode** when the edit page is accessed from the Paid Bible module. Fires a notification that an amendment has been requested. No status change occurs. A banner at the top of the page indicates the page is in view-only mode.

---

### 4.5 Status Workflow

Every network entry progresses through seven ordered stages. Stages cannot be skipped and cannot move backwards. All transitions are validated before being applied.

| Stage | Status Label |
|---|---|
| 1 | Draft |
| 2 | Active |
| 3 | Pricing Updated |
| 4 | Production Started |
| 5 | FTR Approved |
| 6 | Stock Movement Initiated |
| 7 | Network transition complete |

Each transition is validated and executed with full audit logging. If a transition fails at any step, the entry is automatically rolled back to its previous status with no partial state left behind.

A complete timestamped history of every status transition is maintained per entry, recording the from-status, to-status, date, and the action that triggered the change.

---

### 4.6 Lifecycle Flags

As an entry progresses through later stages it surfaces urgency indicators ("Trigger flags") to draw attention to time-sensitive actions.

| Condition | Indicator |
|---|---|
| Entry is at Production Started or FTR Approved | Amber flag |
| Entry is at Stock Movement Initiated | Red flag |
| Entry has reached Network transition complete | Blinking red flag |

These flags appear in three places:
- The Trigger column of the Network Table on the dashboard
- The status flow bar on the edit page
- The entry detail dialog

---

### 4.7 Entry Detail Dialog

Available from the Network Table, a read-only summary dialog can be opened for any entry without navigating away from the dashboard. It shows all key fields organised by section and includes the status flow bar and any active lifecycle flag.

---

### 4.8 Out of Scope — Network Planning

| Item | Notes |
|---|---|
| Creating new entries from within the portal | Entries are ingested from source systems; the portal is view/edit only |
| Deleting entries | Not supported |
| Bulk status transitions across multiple entries | Single-entry transitions only |
| Backwards status transitions | The workflow is one-directional |
| Integration with ERP/planning systems | Out of scope for this phase |
| Email or push notifications on workflow events | Out of scope for this phase |
| Mobile native application | Web application only |

---

## 5. Module 2 — Admin Center

### 5.1 Overview

The Admin Center gives portal administrators control over who can access the portal, what role they hold, which Business Group they belong to, and whether they can be designated as BG Lead. It also ensures network entry ownership continuity — when a Network Planner is deactivated or moved, the admin is guided through reassigning any entries that would otherwise become ownerless.

---

### 5.2 User List

The Admin Center opens on the User Management tab showing all portal users in a table.

**Summary stats** at the top of the page show: total users, active users, inactive users, and number of roles.

**Filters available:**
- Role filter chips — click any role to filter the table to users of that role; click again to clear.
- Status dropdown — show All, Active, or Inactive users.
- Search — free-text search across name, email, and Business Group.
- A user count indicator shows how many users match the current filter.

**Table columns:**

| Column | Content |
|---|---|
| User | Avatar (initials), full name, email address |
| Role | Colour-coded role badge |
| Business Group | BG name; BG Lead crown badge if the user is designated BG Lead |
| Added | Date the user was added to the portal |
| Status | Active or Inactive; click to toggle |
| Actions | Edit button |

---

### 5.3 Add User

An "Add User" button opens a modal form. Required fields:

- Full Name
- Email Address (validated format)
- Role (one of the four defined roles)
- Business Group (one of the five defined BGs)
- BG Lead checkbox — visible and selectable only when the chosen Role is Network Planner

**BG Lead conflict resolution on add:**
If the BG Lead checkbox is ticked and there is already a BG Lead designated for the chosen Business Group, a confirmation dialog appears naming the existing lead and asking the admin to confirm the change. On confirmation, the previous BG Lead's designation is automatically removed. On cancel, the new user is added without BG Lead status.

---

### 5.4 Edit User

Clicking the edit button on any user row opens the same form pre-populated with the user's current details. All fields are editable.

The same BG Lead conflict resolution applies on save (see §5.3).

**Additional rule:** If a user's role is changed away from Network Planner, their BG Lead status is automatically cleared regardless of the BG Lead checkbox value.

---

### 5.5 BG Lead Designation

- At most one Network Planner per Business Group can hold BG Lead status at any time.
- BG Lead planners are identified with a crown badge in the user table, in the Update Assignee picker on network entries, and in the reassignment dialog planner dropdown.
- The designation can only be held by a Network Planner. It cannot be assigned to Category Manager, Supply Chain Manager, or Finance Manager roles.

---

### 5.6 Activate / Deactivate User

Clicking the status toggle on any user row switches their active state.

**Activating** a previously inactive user is applied immediately with no additional checks.

**Deactivating a user who is not a Network Planner** is applied immediately with no additional checks.

**Deactivating a Network Planner** triggers an automatic check: does this planner have any network entries assigned to them that have not yet reached "Network transition complete"? These are referred to as **incomplete entries**.

- If no incomplete entries exist → the deactivation is applied immediately.
- If incomplete entries exist → the Reassignment Dialog is shown before the deactivation is applied (see §5.7).

---

### 5.7 Reassignment Dialog

The Reassignment Dialog is shown whenever a proposed user change would leave network entries without a valid owner. The dialog appears **before** the change is committed; cancelling it leaves the user record and all entries exactly as they were.

#### 5.7.1 When It Appears

| Trigger | Condition |
|---|---|
| **User deactivated** | The user is a Network Planner with one or more incomplete entries |
| **Role changed** | The user's current role is Network Planner and the new role is not Network Planner, and they have one or more incomplete entries |
| **Business Group changed** | The user is a Network Planner and their BG is being changed, and they have incomplete entries assigned in the old BG |

An **incomplete entry** is any entry whose current status is not "Network transition complete".

#### 5.7.2 What the Dialog Shows

- A banner at the top identifying the trigger reason (User Deactivated / Role Changed / Business Group Changed) and a plain-language description of why reassignment is needed.
- A live progress bar showing how many of the affected entries have been assigned a new planner so far.
- The total count of incomplete entries that need reassignment.

#### 5.7.3 Bulk Assign Mode (default)

The admin selects one Network Planner from a dropdown. All affected entries are assigned to that planner. A scrollable list below previews every affected entry showing its CBU code, current status, material description, and the selected planner's name once chosen.

#### 5.7.4 Assign Individually Mode

The admin switches to individual mode to assign a different planner to each entry.

A quick-fill control at the top of the list lets the admin apply one planner to all entries in a single click, after which individual rows can be changed independently.

Each row in the list shows the entry's CBU code, status, material description, a planner dropdown, and a visual indicator (check / empty circle) showing whether that entry has been assigned.

The Confirm button remains disabled until every listed entry has a planner selected.

#### 5.7.5 Available Planners in the Dropdown

The planner dropdown is filtered to show only:
- Active users
- With the role of Network Planner
- In the same Business Group as the affected entries (i.e. the user's old BG for a BG-change trigger)
- Excluding the user being changed

BG Lead planners are identified with a crown icon.

If no eligible planners exist (e.g. the BG has no other active Network Planners), a warning is shown and the Confirm button remains disabled. The admin must cancel and resolve the gap before proceeding.

#### 5.7.6 Dialog Actions

| Button | Behaviour |
|---|---|
| **Confirm & Reassign (N)** | Updates the assigned planner on each affected entry; then applies the pending user change (deactivation or edit). Only enabled when all entries have been assigned a planner. |
| **Cancel** | Closes the dialog. The pending user change is **not** applied. All entries remain assigned to the original planner. |

---

### 5.8 Roles & Permissions Reference

A second sub-tab in the Admin Center provides a read-only matrix listing what each role can do across the portal. This serves as an in-app reference for administrators when assigning roles to new users.

---

### 5.9 Out of Scope — Admin Center

| Item | Notes |
|---|---|
| Single sign-on (SSO) or Active Directory integration | Out of scope for this phase |
| Enforcing role permissions at the database or API layer | Handled at the UI layer in this phase |
| Audit log of admin actions | Out of scope for this phase |
| Self-service registration or password reset | Out of scope for this phase |
| Bulk user import or export | Out of scope for this phase |
| Email notifications to users on role or BG changes | Out of scope for this phase |
| Persistence of user records to the backend database | User data is managed in session state in this phase; backend persistence is a future enhancement |

---

## 6. Acceptance Criteria

| # | Criterion |
|---|---|
| AC-01 | The Summary dashboard displays total, Draft, Active, and Network Transition Complete counts that update in real time as entries change status. |
| AC-02 | The Pending by Status ageing table correctly assigns entries to the 7–30 day, 1–3 month, and >3 month buckets based on CBU Created Date. |
| AC-03 | The Pending by Assignee panel reflects current entry assignments and is sorted by pending count descending. |
| AC-04 | Save Draft saves all field changes on a Draft entry without running activation validation and without changing the entry's status. |
| AC-05 | Submit & Activate is blocked with an informative message if any of the three required dates are missing, or if no cluster, depot, or channel is selected. |
| AC-06 | The activation confirmation dialog correctly previews the dates, predecessor/successor CBU, and distribution before the transition is triggered. |
| AC-07 | Status transitions cannot be skipped and cannot move backwards. |
| AC-08 | On failure during a status transition, the entry is automatically reverted to its previous status with no partial state remaining. |
| AC-09 | Lifecycle flags (amber, red, blinking red) appear in the correct stage conditions in the table, edit page, and detail dialog. |
| AC-10 | The Update Assignee picker on the edit page shows only active Network Planners belonging to the same Business Group as the entry. |
| AC-11 | BG Lead status can only be assigned to users with the Network Planner role; changing a user's role away from Network Planner automatically clears their BG Lead status. |
| AC-12 | Designating a new BG Lead when one already exists for that BG requires admin confirmation and automatically demotes the previous lead. |
| AC-13 | Deactivating a Network Planner who has incomplete entries shows the Reassignment Dialog before the deactivation is applied. |
| AC-14 | Changing a Network Planner's role or Business Group when they have incomplete entries shows the Reassignment Dialog before the change is applied. |
| AC-15 | Cancelling the Reassignment Dialog leaves the user record and all network entry assignments unchanged. |
| AC-16 | Bulk Assign mode reassigns all listed entries to the selected planner on confirmation. |
| AC-17 | Assign Individually mode requires a planner to be selected for every entry before the Confirm button is enabled. |
| AC-18 | The planner dropdown in the Reassignment Dialog excludes the user being changed and only shows active Network Planners in the relevant Business Group. |
| AC-19 | View-only mode (accessed from the Paid Bible) hides all activation controls, shows the amber read-only banner, and displays the Raise Amendment Request button in place of Save. |

---

*End of Functional Scope Document*
