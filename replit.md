# Unilever Network Visibility Portal

## Overview
A central portal for managing network visibility across all Unilever product categories. Built with Unilever's brand identity (blue gradient header, Open Sans typography).

## Architecture
- **Frontend**: React + TypeScript with Vite, TanStack Query, wouter routing, shadcn/ui components
- **Backend**: Express.js REST API
- **Storage**: In-memory storage with seed data (5 realistic entries)
- **Styling**: Tailwind CSS with Unilever-branded color tokens (HSL 199 blue primary)

## Key Features
- Dashboard with stats cards (Total, Active, Draft, Production Started)
- Data table with pagination, search, and status filtering
- Create/Edit form dialog with 4 tabs (Basic Info, Product Details, Dimensions, Distribution)
- View detail dialog with organized sections
- Multi-select fields for Geography, Depot, and Channel

## Data Model
`networkEntries` table with ~37 fields covering:
- Basic info (CBU code, dates, annexure, network type)
- Product details (brand, BG, format, profit centre, etc.)
- Dimensions (weight, length, width, height, EAN, ITF)
- Distribution (geography, depot, channel as arrays)

## File Structure
- `client/src/pages/dashboard.tsx` - Main dashboard page
- `client/src/components/unilever-header.tsx` - Branded header with gradient nav
- `client/src/components/stats-cards.tsx` - Summary stat cards
- `client/src/components/network-table.tsx` - Data table with pagination
- `client/src/components/entry-form-dialog.tsx` - Create/edit form
- `client/src/components/entry-detail-dialog.tsx` - View details
- `server/routes.ts` - REST API endpoints
- `server/storage.ts` - In-memory storage with CRUD and seed data
- `shared/schema.ts` - Data model and types

## API Endpoints
- `GET /api/network-entries` - List all entries
- `GET /api/network-entries/:id` - Get single entry
- `POST /api/network-entries` - Create entry
- `PATCH /api/network-entries/:id` - Update entry
- `DELETE /api/network-entries/:id` - Delete entry
