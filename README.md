# CYPEX Multi-Tenant Demo

A demonstration of PostgreSQL Row Level Security (RLS) for multi-tenant data isolation, featuring PostgREST API and Node.js authentication service.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client/Test   │────▶│   Auth Service  │────▶│   PostgreSQL    │
│                 │     │  (Port 4000)    │     │   (Port 5432)   │
└─────────────────┘     └────────┬────────┘     └────────▲────────┘
                                 │ JWT                   │
                                 ▼                       │
                        ┌─────────────────┐              │
                        │    PostgREST    │──────────────┘
                        │   (Port 3000)   │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local development)
- curl or httpie (for testing)

### 1. Start Services

```bash
# Clone and enter directory
cd cypex-multi-tenant

# Copy environment file (adjust if needed)
cp .env.example .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### 2. Verify Services

```bash
# PostgreSQL
docker-compose exec postgres psql -U postgres -d cypex -c "SELECT 1"

# PostgREST
curl http://localhost:3000/

# Auth API
curl http://localhost:4000/health
```

## Usage

### Authentication

```bash
# Login to get JWT
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@acme.com", "orgSlug": "acme"}'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "expiresIn": "15m"
# }
```

### API Requests (with JWT)

```bash
# Set token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# List notes (filtered by org automatically via RLS)
curl http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN"

# Create note
curl -X POST http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My Note", "body": "Content here"}'

# Delete note (admin only)
curl -X DELETE "http://localhost:3000/note?id=eq.<note-id>" \
  -H "Authorization: Bearer $TOKEN"

# Get my notes only (RPC)
curl -X POST http://localhost:3000/rpc/notes_for_me \
  -H "Authorization: Bearer $TOKEN"
```

## Test Scenarios

### Scenario 1: Tenant Isolation

```bash
# Login as ACME user
ACME_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@acme.com", "orgSlug": "acme"}' | jq -r .token)

# Login as GLOBEX user
GLOBEX_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "bob@globex.com", "orgSlug": "globex"}' | jq -r .token)

# ACME user sees only ACME notes
curl http://localhost:3000/note -H "Authorization: Bearer $ACME_TOKEN"

# GLOBEX user sees only GLOBEX notes
curl http://localhost:3000/note -H "Authorization: Bearer $GLOBEX_TOKEN"
```

### Scenario 2: Admin-Only Delete

```bash
# Login as editor (non-admin)
EDITOR_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "charlie@acme.com", "orgSlug": "acme"}' | jq -r .token)

# Try to delete (should fail with 403)
curl -X DELETE "http://localhost:3000/note?id=eq.<note-id>" \
  -H "Authorization: Bearer $EDITOR_TOKEN"
# Response: 403 Forbidden
```

## Development

### Local Auth API Development

```bash
cd auth-api

# Install dependencies
npm install

# Generate pgTyped types
npm run generate

# Run in development mode
npm run dev
```

### Database Migrations

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d cypex

# Or run migrations manually
docker-compose exec postgres psql -U postgres -d cypex -f /path/to/migration.sql
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-api
docker-compose logs -f postgrest
docker-compose logs -f postgres
```

## Project Structure

```
cypex-multi-tenant/
├── docker-compose.yml      # Service orchestration
├── .env                    # Environment configuration
├── README.md               # This file
├── docs/
│   ├── ADR.md              # Architecture decisions
│   ├── pgss.txt            # pg_stat_statements snapshot
│   └── explain.txt         # EXPLAIN ANALYZE results
├── db/
│   ├── init.sql            # Migration orchestrator
│   └── migrations/
│       ├── 001_schema.sql  # Tables and indexes
│       ├── 002_rls.sql     # Row Level Security policies
│       ├── 003_functions.sql # RPC functions
│       └── 004_seed.sql    # Test data
└── auth-api/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts        # Entry point
        ├── config/         # Configuration
        ├── controllers/    # HTTP handlers
        ├── services/       # Business logic
        ├── middlewares/    # Error handling
        ├── dto/            # Request/Response types
        ├── queries/        # SQL queries (pgTyped)
        └── utils/          # Helpers (logger, etc.)
```

## Troubleshooting

### PostgREST returns 401

- Check JWT secret matches in `.env`
- Verify token hasn't expired (15min default)
- Ensure `aud` claim matches `PGRST_JWT_AUD`

### RLS blocking all rows

- Verify `org_id` in JWT matches user's organization
- Check RLS policies are enabled: `SELECT * FROM pg_policies`
- Test with superuser to bypass RLS: `SET ROLE postgres`

### Database connection refused

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify credentials
docker-compose exec postgres psql -U postgres -d cypex
```

### Auth API not starting

```bash
# Check logs
docker-compose logs auth-api

# Rebuild container
docker-compose build auth-api
docker-compose up -d auth-api
```

## Performance Analysis

### Enable pg_stat_statements

Already enabled via `docker-compose.yml` postgres command.

```sql
-- View top queries
SELECT query, calls, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### EXPLAIN ANALYZE

```sql
-- Analyze note query with RLS
SET request.jwt.claims = '{"org_id": "uuid-here"}';
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM note WHERE org_id = current_setting('request.jwt.claims')::json->>'org_id';
```

## Security Notes

⚠️ **This is a demo application**

- Authentication is simplified (no password verification)
- JWT secret is static (rotate in production)
- No rate limiting implemented
- No HTTPS (use reverse proxy in production)

For production, add:
- Password hashing (bcrypt/argon2)
- Refresh token rotation
- Rate limiting
- HTTPS termination
- Secret management (Vault, AWS Secrets Manager)

## License

MIT
