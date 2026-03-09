# Network Insight Dashboard

A central portal for managing network visibility across all product categories. Built with React + FastAPI + PostgreSQL, fully containerized with Docker.

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Run with Docker Compose

```bash
# Clone the repository
git clone <repository-url>
cd Network-Insight-Dashboard-1

# Start all services (builds images on first run)
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes (resets database)
docker compose down -v
```

### Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | React dashboard |
| **Backend API** | http://localhost:8001/api | FastAPI (also proxied via frontend) |
| **API Docs** | http://localhost:8001/docs | Swagger UI |
| **Database** | localhost:5433 | PostgreSQL |

### Verify Services

```bash
# Check container status
docker compose ps

# Test API health
curl http://localhost:3000/api/health
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                    http://localhost:3000                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Frontend (nginx)                           │
│                      Port 3000                               │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │  Static Files   │    │  /api/* → proxy → backend:8000  │ │
│  │  (React SPA)    │    │                                 │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Backend (FastAPI)                          │
│                      Port 8000                               │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────────────┐ │
│  │ List Master │ │    State    │ │   Saga Orchestrator    │ │
│  │   Service   │ │  Management │ │  (multi-step workflows)│ │
│  └─────────────┘ └─────────────┘ └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                  PostgreSQL Database                         │
│                      Port 5432                               │
│  Tables: network_entries, state_transitions, channels_master │
│          clusters_master, depots_master, entry_statuses      │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL 16 |
| Containerization | Docker, Docker Compose |
| Proxy | Nginx (API reverse proxy) |

## API Endpoints

### Network Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/network-entries` | List all entries |
| GET | `/api/network-entries/{id}` | Get entry by ID |
| PATCH | `/api/network-entries/{id}` | Update entry |

### Lifecycle
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lifecycle` | Get lifecycle data with color flags |

### Reference Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reference-data/channels` | List channels |
| GET | `/api/reference-data/clusters` | List clusters |
| GET | `/api/reference-data/depots` | List depots |

### Saga (Status Transitions)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/saga/transition/{id}` | Transition entry status |
| POST | `/api/saga/reference-data` | Fetch all reference data |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Service health check |

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (set in compose) | PostgreSQL connection string |
| `PORT` | `8000` | Server port |

### Frontend (Build-time)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `""` | API base URL (empty = same origin) |

## Development

### Local Development (without Docker)

**Backend:**
```bash
cd server_py
pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic python-dotenv
export DATABASE_URL="postgresql://user:pass@localhost:5432/network_insight"
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
npm install
npm run dev
```

### Database Access

```bash
# Connect to PostgreSQL inside container
docker compose exec db psql -U unilever -d network_insight

# Run SQL query
docker compose exec db psql -U unilever -d network_insight -c "SELECT count(*) FROM network_entries;"
```

## Troubleshooting

### Containers not starting
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Rebuild from scratch
docker compose down -v
docker compose up --build -d
```

### API returns 502 Bad Gateway
The backend may still be starting. Wait a few seconds and refresh. The frontend waits for backend health before starting.

### Data not showing in UI
1. Hard refresh browser: `Ctrl+Shift+R`
2. Clear browser cache or use Incognito mode
3. Verify API returns data: `curl http://localhost:3000/api/network-entries`

### Reset database
```bash
docker compose down -v
docker compose up --build -d
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── controllers/    # Business logic hooks
│   │   ├── pages/          # Page components
│   │   └── lib/            # Utilities
├── server_py/              # FastAPI backend
│   ├── services/           # Microservices (router/service/storage)
│   ├── saga/               # Saga orchestrator
│   ├── models.py           # Pydantic models
│   └── main.py             # App entry point
├── shared/                 # Shared types
├── docker-compose.yml      # Container orchestration
├── Dockerfile.backend      # Backend image
├── Dockerfile.frontend     # Frontend image (nginx)
└── README.md               # This file
```

## License

Proprietary - All rights reserved.
