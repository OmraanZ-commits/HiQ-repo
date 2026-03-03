# Unilever Network Visibility Portal

## Overview
A central portal for managing network visibility across all Unilever product categories. Built with Unilever's brand identity (blue gradient header, Open Sans typography). Uses MVC architecture.

## Architecture (MVC)
- **Models**: `shared/schema.ts` - Data schemas and TypeScript types
- **Views**: `client/src/components/` and `client/src/pages/` - React components
- **Controllers**: `client/src/controllers/` - Business logic hooks (useNetworkEntries)
- **Backend**: Express.js REST API with in-memory storage

## Tech Stack
- Frontend: React + TypeScript, Vite, TanStack Query, wouter routing, shadcn/ui
- Backend: Express.js REST API
- Storage: In-memory with seed data (5 entries)
- Styling: Tailwind CSS with Unilever-branded color tokens (HSL 199 blue primary)

## Key Features
- Dashboard with gradient stat cards (Total, Active, Draft, Production Started)
- Data table with CBU Created Date, Assigned Person columns, search, and status filtering
- Fullscreen edit page with tabbed form (Basic Info, Product Details, Dimensions, Distribution)
- Status flow progress bar (7 steps: Draft → Active → Pricing Updated → Production Started → FTR Approved → Stock Movement Initiated → CBU Transition Complete)
- Distribution tab: dark navy themed left filter panel (collapsible Geography/Depot/Channel sections from Excel master data), right panel with coverage stat cards, distribution matrix preview, and India SVG cluster map with state highlighting
- View detail dialog with organized sections and status flow
- Year auto-calculated from CBU Created Date
- Assigned Person field with avatar initials in table
- Read-only fields for data-sourced values; editable fields for manual input
- No create new / delete entry actions (view + edit only)

## Status Flow
7-step progression exported as STATUS_FLOW constant:
1. Draft
2. Active
3. Pricing Updated
4. Production Started
5. FTR Approved
6. Stock Movement Initiated
7. CBU Transition Complete

## Data Model
`networkEntries` table with ~38 fields covering:
- Basic info (CBU code, dates, annexure, network type, assigned person)
- Product details (brand, BG, format, profit centre, etc.)
- Dimensions (weight, length, width, height, EAN, ITF)
- Distribution (geography=18 Indian clusters, depot=24 depot codes, channel=9 channels with MT sub-channels, all from Excel master data)

## File Structure
- `client/src/controllers/useNetworkEntries.ts` - Controller hook
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/pages/edit-entry.tsx` - Fullscreen edit page
- `client/src/components/unilever-header.tsx` - Branded header
- `client/src/components/stats-cards.tsx` - Gradient stat cards
- `client/src/components/status-flow.tsx` - 7-step status progress bar
- `client/src/components/network-table.tsx` - Data table (view + edit actions, assigned person column)
- `client/src/components/entry-detail-dialog.tsx` - View details dialog with status flow
- `server/routes.ts` - REST API endpoints
- `client/src/lib/distribution-data.ts` - Master data constants (clusters, depots, channels from Excel)
- `client/src/components/india-map.tsx` - SVG India map with cluster-to-state highlighting
- `server/storage.ts` - In-memory storage with CRUD and seed data
- `shared/schema.ts` - Data model, types, and STATUS_FLOW constant

## API Endpoints
- `GET /api/network-entries` - List all entries
- `GET /api/network-entries/:id` - Get single entry
- `POST /api/network-entries` - Create entry
- `PATCH /api/network-entries/:id` - Update entry
- `DELETE /api/network-entries/:id` - Delete entry

## Routes
- `/` - Dashboard with table and stats
- `/edit/:id` - Fullscreen edit page for an entry
