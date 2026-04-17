# Unilever Network Visibility Portal

## Overview
The Unilever Network Visibility Portal is a central application designed to manage and provide visibility into network changes across all Unilever product categories. Its primary purpose is to streamline the lifecycle of network entries, from initial drafting and activation through various stages of production and network transition. The portal aims to improve data consistency, facilitate multi-step approval workflows, and offer comprehensive analytics for supply chain and product management. Key capabilities include managing network entries, orchestrating complex status transitions via a Saga pattern, and providing detailed dashboards for tracking and analysis. The project vision is to enhance operational efficiency and strategic decision-making by offering a unified platform for network visibility.

## User Preferences
I prefer detailed explanations and iterative development. Ask before making major changes.

## System Architecture

### UI/UX Decisions
The portal adheres to Unilever's brand identity, featuring a blue gradient header and Open Sans typography. It utilizes `shadcn/ui` for components and Tailwind CSS for styling, incorporating Unilever-branded color tokens (HSL 199 blue primary). The dashboard presents information through two tabs: a Summary tab for analytics with gradient metric strips and segmented pipeline bars, and a Network tab for data tables. Edit pages are fullscreen with tabbed forms and a 7-step color-coded status flow progress bar. Detailed views are presented in dialogs with organized sections.

### Technical Implementations
The system employs a Model-View-Controller (MVC) pattern for the frontend, built with React and TypeScript, Vite for tooling, TanStack Query for data fetching, and wouter for routing. The backend is implemented using Python 3.12 and FastAPI (uvicorn), following a layered microservices architecture (Router → Service → Storage). PostgreSQL is used as the database, accessed via SQLAlchemy.

### Feature Specifications
**Core Features:**
- **Network Entry Management:** Full CRUD operations for network entries, including fields for basic info, product details, dimensions, distribution (geography, depot, channel, `channelMapping` JSONB), and sourcing matrix.
- **Saga-orchestrated Status Transitions:** A 7-step status flow (Draft, Active, Pricing Updated, Production Started, FTR Approved, Stock Movement Initiated, Network transition complete) managed by a Saga Orchestrator for multi-step, transactional updates with automatic rollback on failure.
- **Lifecycle Management:** Automated computation and display of lifecycle color flags (Amber, Red, Blinking Red) and urgency levels based on entry status, visible in tables, edit pages, and detail dialogs.
- **Dashboard:** Provides a two-tab view: a Summary tab with analytics (total, draft, active, NW complete counts and percentages, pending items by status and assignee) and a Network tab for detailed data display with search and filtering.
- **Edit Page Functionality:** Tabbed interface for editing various aspects of a network entry, including detailed configuration for pricing lots, distribution matrices (geo-channel mapping), and sourcing modes (Decentralized/Centralized). Includes robust date validation and activation confirmation dialogs.
- **Paid Bible Module:** Manages basepack analytics and status. Features an Overview tab with inline status editing, an Activation Check dialog with MSTN coverage evaluation, and a unified Service Requests tab.
- **Unified Service Requests (SR) Model:** Consolidates four types of service requests (Basepack Status Change, CBU Geo Extension, CBU Channel Extension, CBU Sourcing Amendment) under a single model with common ID format (`SR-XXXXXX`), approval chains, and a unified UI for listing and detail viewing.
- **User Management (Admin Center):** Allows management of portal users, roles (Admin, Network Planner, Paid Bible Owner, etc.), and business groups. Includes functionality for designating Business Group Leads and handling reassignment of network entries upon role changes, BG changes, or user deactivation.
- **View-Only Mode:** Provides a restricted view of network entries when accessed from specific contexts (e.g., Paid Bible), replacing edit controls with a "Raise Amendment Request" button and displaying an amber banner.

### System Design Choices
- **Microservices Architecture:** Each domain (List Master, State Management, Lifecycle, Users) is a distinct microservice following a `Router → Service → Storage` pattern, promoting separation of concerns and scalability.
- **Saga Pattern:** Critical for orchestrating complex, multi-service transactions (e.g., status transitions, SR approvals) ensuring data consistency with compensation logic for failures. Status transitions explicitly route through the Saga Orchestrator, not direct service endpoints.
- **Unified Data Model:** Consolidation of Amendment and Service Request entities into a single `ServiceRequest` model to simplify management and UI.
- **Seed Data:** `main.py` is kept lean by extracting seed data into dedicated scripts for network entries and users, designed for safe re-execution.
- **Unilever Brand Compliance:** Integrated directly into styling (Tailwind CSS color tokens) and component design.

## External Dependencies
- **Frontend:** React, TypeScript, Vite, TanStack Query, wouter, shadcn/ui.
- **Backend:** Python 3.12, FastAPI, uvicorn.
- **Database:** PostgreSQL (Docker for local, Azure Database for PostgreSQL for production) via SQLAlchemy.
- **Proxy (Development):** Express.js for serving the Vite frontend and proxying API requests to FastAPI.