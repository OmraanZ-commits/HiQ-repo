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
- Data table with CBU Created Date column, search, and status filtering
- Fullscreen edit page with tabbed form (Basic Info, Product Details, Dimensions, Distribution)
- View detail dialog with organized sections
- Year auto-calculated from CBU Created Date
- No create new / delete entry actions (view + edit only)
- Removed sourcing matrix label

## Data Model
`networkEntries` table with ~37 fields covering:
- Basic info (CBU code, dates, annexure, network type)
- Product details (brand, BG, format, profit centre, etc.)
- Dimensions (weight, length, width, height, EAN, ITF)
- Distribution (geography, depot, channel as arrays)

## File Structure
- `client/src/controllers/useNetworkEntries.ts` - Controller hook
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/pages/edit-entry.tsx` - Fullscreen edit page
- `client/src/components/unilever-header.tsx` - Branded header
- `client/src/components/stats-cards.tsx` - Gradient stat cards
- `client/src/components/network-table.tsx` - Data table (view + edit actions)
- `client/src/components/entry-detail-dialog.tsx` - View details dialog
- `server/routes.ts` - REST API endpoints
- `server/storage.ts` - In-memory storage with CRUD and seed data
- `shared/schema.ts` - Data model and types

## API Endpoints
- `GET /api/network-entries` - List all entries
- `GET /api/network-entries/:id` - Get single entry
- `POST /api/network-entries` - Create entry
- `PATCH /api/network-entries/:id` - Update entry
- `DELETE /api/network-entries/:id` - Delete entry

## Routes
- `/` - Dashboard with table and stats
- `/edit/:id` - Fullscreen edit page for an entry
