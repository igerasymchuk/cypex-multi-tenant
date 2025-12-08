# CYPEX Multi-Tenant Demo

A demonstration of PostgreSQL Row Level Security (RLS) for multi-tenant data isolation, featuring PostgREST API and Node.js authentication service.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Test Users](#test-users)
- [API Reference](#api-reference)
- [Test Scenarios](#test-scenarios)
- [Development](#development)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)
- [Performance Analysis](#performance-analysis)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Security Notes](#security-notes)

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

### Components

| Service | Port | Description |
|---------|------|-------------|
| **PostgreSQL** | 5432 | Database with RLS policies for tenant isolation |
| **PostgREST** | 3000 | Auto-generated REST API from database schema |
| **Auth API** | 4000 | Node.js service for authentication & JWT issuance |

### Multi-Tenancy Strategy

- **Shared schema with RLS** - All tenants share the same tables
- **`org_id` discriminator** - Every tenant-scoped table has an `org_id` column
- **JWT-based isolation** - `org_id` embedded in JWT, extracted by RLS policies
- **Zero application logic** - Database enforces isolation automatically

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 22+ (for local development)
- curl and jq (for testing)

### 1. Start Services

```bash
# Clone and enter directory
cd cypex-multi-tenant

# Copy environment file
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

# PostgREST (should return OpenAPI schema)
curl http://localhost:3000/

# Auth API health check
curl http://localhost:4000/health
```

### 3. Quick Test

```bash
# Login as admin (requires email + orgSlug)
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "armin@cybertec.at", "orgSlug": "cybertec"}' | jq -r .token)

# List notes (filtered by org automatically via RLS)
curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Test Users

### Cybertec Organization (`orgSlug: "cybertec"`)

| Email | Role | Can Delete Notes |
|-------|------|------------------|
| `armin@cybertec.at` | admin | Yes |
| `svitlana@cybertec.at` | editor | No |
| `bob@cybertec.at` | editor | No |

### Ivan Corp Organization (`orgSlug: "ivancorp"`)

| Email | Role | Can Delete Notes |
|-------|------|------------------|
| `ivan@corp.com` | admin | Yes |
| `bob@corp.com` | editor | No |

## API Reference

### Auth API (Port 4000)

#### Health Check
```bash
curl http://localhost:4000/health
```

#### Login
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "armin@cybertec.at", "orgSlug": "cybertec"}'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "user": {
#     "id": "c1000000-...",
#     "email": "armin@cybertec.at",
#     "role": "admin",
#     "org_id": "c0000000-..."
#   }
# }
```

#### Verify Token
```bash
curl http://localhost:4000/auth/verify \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "valid": true,
#   "user": {
#     "id": "c1000000-...",
#     "role": "admin",
#     "org_id": "c0000000-..."
#   },
#   "expires_at": "2025-12-08T12:00:00.000Z"
# }
```

#### Get Current User
```bash
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Response (from JWT claims, no email):
# {
#   "id": "c1000000-...",
#   "role": "admin",
#   "org_id": "c0000000-..."
# }
```

#### OpenAPI Documentation
```bash
# Swagger UI available at:
open http://localhost:4000/api-docs
```

### PostgREST API (Port 3000)

All endpoints require a valid JWT token in the `Authorization: Bearer` header.

#### Notes CRUD

```bash
# List all notes (filtered by org via RLS)
curl http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN"

# Get single note
curl "http://localhost:3000/note?id=eq.<note-id>" \
  -H "Authorization: Bearer $TOKEN"

# Create note (org_id and author_id auto-filled from JWT)
curl -X POST http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"title": "My Note", "body": "Content here"}'

# Update note
curl -X PATCH "http://localhost:3000/note?id=eq.<note-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}'

# Delete note (admin only)
curl -X DELETE "http://localhost:3000/note?id=eq.<note-id>" \
  -H "Authorization: Bearer $TOKEN"
```

#### RPC Functions

```bash
# Get my notes only
curl -X POST http://localhost:3000/rpc/notes_for_me \
  -H "Authorization: Bearer $TOKEN"

# Create note via RPC (alternative to POST /note)
curl -X POST http://localhost:3000/rpc/create_note \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"p_title": "Note Title", "p_body": "Note body"}'
```

#### Observability (Admin Only)

```bash
# Database overview
curl -X POST http://localhost:3000/rpc/database_stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Query statistics (top 20 by total time)
curl -X POST http://localhost:3000/rpc/query_stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_results": 20}'

# Find slow queries (mean > 50ms)
curl -X POST http://localhost:3000/rpc/slow_queries \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold_ms": 50}'

# Table statistics
curl -X POST http://localhost:3000/rpc/table_stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Reset query statistics
curl -X POST http://localhost:3000/rpc/reset_query_stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Test Scenarios

### Scenario 1: Tenant Isolation

```bash
# Login as Cybertec user
CYBERTEC_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "armin@cybertec.at", "orgSlug": "cybertec"}' | jq -r .token)

# Login as Ivan Corp user
IVANCORP_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "ivan@corp.com", "orgSlug": "ivancorp"}' | jq -r .token)

# Cybertec user sees only Cybertec notes (should show 4 notes)
curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $CYBERTEC_TOKEN" | jq 'length'

# Ivan Corp user sees only Ivan Corp notes (should show 3 notes)
curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $IVANCORP_TOKEN" | jq 'length'
```

### Scenario 2: Admin-Only Delete

```bash
# Login as editor (non-admin)
EDITOR_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "svitlana@cybertec.at", "orgSlug": "cybertec"}' | jq -r .token)

# Create a note first
NOTE_ID=$(curl -s -X POST http://localhost:3000/note \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"title": "Test Note", "body": "To be deleted"}' | jq -r '.[0].id')

# Try to delete as editor (should fail - no rows affected)
curl -X DELETE "http://localhost:3000/note?id=eq.$NOTE_ID" \
  -H "Authorization: Bearer $EDITOR_TOKEN"

# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "armin@cybertec.at", "orgSlug": "cybertec"}' | jq -r .token)

# Delete as admin (should succeed)
curl -X DELETE "http://localhost:3000/note?id=eq.$NOTE_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Scenario 3: Cross-Tenant Isolation

```bash
# Get a note ID from Cybertec
CYBERTEC_NOTE=$(curl -s http://localhost:3000/note \
  -H "Authorization: Bearer $CYBERTEC_TOKEN" | jq -r '.[0].id')

# Try to access Cybertec note as Ivan Corp user (should return empty array)
curl -s "http://localhost:3000/note?id=eq.$CYBERTEC_NOTE" \
  -H "Authorization: Bearer $IVANCORP_TOKEN" | jq
# Result: []
```

## Development

### Local Auth API Development

```bash
cd auth-api

# Install dependencies
npm install

# Run in development mode (hot reload)
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | postgres | PostgreSQL username |
| `POSTGRES_PASSWORD` | postgres | PostgreSQL password |
| `POSTGRES_DB` | cypex | Database name |
| `JWT_SECRET` | (fallback) | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | 15m | Token expiration time |
| `LOG_LEVEL` | info | Logging level (debug, info, warn, error) |

### Database Migrations

Migrations run automatically on container startup. To run manually:

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d cypex

# View all tables
\dt public.*

# View RLS policies
SELECT * FROM pg_policies;

# View functions
\df api.*
```

### Adding New Migrations

1. Create a new file in `db/migrations/` with the next sequence number
2. Follow the naming pattern: `00X_description.sql`
3. Restart postgres container or run manually:

```bash
docker-compose exec postgres psql -U postgres -d cypex \
  -f /docker-entrypoint-initdb.d/migrations/00X_description.sql
```

## Debugging

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-api
docker-compose logs -f postgrest
docker-compose logs -f postgres
```

### Enable Debug Logging

```bash
# Auth API - set LOG_LEVEL=debug in .env
LOG_LEVEL=debug docker-compose up -d auth-api

# Or for local development
LOG_LEVEL=debug npm run dev
```

### Inspect JWT Token

```bash
# Decode JWT (base64) - paste your token
echo "YOUR_TOKEN_HERE" | cut -d. -f2 | base64 -d 2>/dev/null | jq

# Or use jwt.io
open "https://jwt.io/#debugger-io?token=$TOKEN"

# JWT Claims Structure:
# {
#   "sub": "uuid",           // User ID
#   "org_id": "uuid",        // Organization ID (for RLS)
#   "role": "admin",         // User role (admin/editor)
#   "scopes": ["notes:read", "notes:write"],
#   "iss": "cypex-hire",     // Issuer
#   "aud": "postgrest"       // Audience
# }
```

### Debug RLS Policies

```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d cypex

# Simulate JWT claims (as if PostgREST set them)
SET request.jwt.claims = '{"org_id": "c0000000-0000-0000-0000-000000000001", "sub": "c1000000-0000-0000-0000-000000000001", "role": "admin"}';

# Test query as api_user
SET ROLE api_user;
SELECT * FROM note;

# Check which policies apply
SELECT * FROM pg_policies WHERE tablename = 'note';

# Reset role
RESET ROLE;
```

### Test PostgREST Directly

```bash
# Check PostgREST configuration
curl http://localhost:3000/

# Test with verbose output
curl -v http://localhost:3000/note \
  -H "Authorization: Bearer $TOKEN"
```

### Database Connection Test

```bash
# Test connection from host
psql -h localhost -p 5432 -U postgres -d cypex

# Test connection from within Docker network
docker-compose exec auth-api nc -zv postgres 5432
```

## Troubleshooting

### PostgREST returns 401 Unauthorized

**Causes:**
- JWT secret mismatch between Auth API and PostgREST
- Token expired (default 15 minutes)
- Missing or malformed Authorization header

**Solutions:**
```bash
# Verify JWT_SECRET matches in .env
grep JWT_SECRET .env

# Get a fresh token
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "armin@cybertec.at", "orgSlug": "cybertec"}' | jq -r .token)

# Verify token format
echo "Authorization: Bearer $TOKEN"
```

### PostgREST returns empty array (RLS blocking)

**Causes:**
- `org_id` in JWT doesn't match data
- RLS policies misconfigured
- User doesn't exist in database

**Solutions:**
```bash
# Verify JWT claims
curl http://localhost:4000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq

# Check org_id matches expected organization
docker-compose exec postgres psql -U postgres -d cypex \
  -c "SELECT id, name, slug FROM org"

# Verify RLS policies
docker-compose exec postgres psql -U postgres -d cypex \
  -c "SELECT * FROM pg_policies WHERE tablename = 'note'"
```

### Database Connection Refused

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check logs for errors
docker-compose logs postgres | tail -50

# Restart PostgreSQL
docker-compose restart postgres

# Verify credentials
docker-compose exec postgres psql -U postgres -d cypex -c "SELECT 1"
```

### Auth API Not Starting

```bash
# Check logs
docker-compose logs auth-api | tail -50

# Rebuild container
docker-compose build --no-cache auth-api
docker-compose up -d auth-api

# Check port availability
lsof -i :4000
```

### Permission Denied Errors

```bash
# Check role grants
docker-compose exec postgres psql -U postgres -d cypex \
  -c "\dp api.*"

# Check function permissions
docker-compose exec postgres psql -U postgres -d cypex \
  -c "\df+ api.*"
```

### Reset Everything

```bash
# Stop and remove containers, volumes
docker-compose down -v

# Remove all data and restart fresh
docker-compose up -d
```

## Performance Analysis

### Enable pg_stat_statements

Already enabled via `docker-compose.yml`. To verify:

```bash
docker-compose exec postgres psql -U postgres -d cypex \
  -c "SELECT * FROM pg_stat_statements LIMIT 1"
```

### Analyze Query Performance

```bash
# Login as admin
ADMIN_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "armin@cybertec.at", "orgSlug": "cybertec"}' | jq -r .token)

# Get top queries by total time
curl -s -X POST http://localhost:3000/rpc/query_stats \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_results": 10}' | jq

# Find slow queries
curl -s -X POST http://localhost:3000/rpc/slow_queries \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold_ms": 10}' | jq
```

### EXPLAIN ANALYZE

```bash
docker-compose exec postgres psql -U postgres -d cypex <<'EOF'
-- Simulate JWT context
SET request.jwt.claims = '{"org_id": "c0000000-0000-0000-0000-000000000001"}';
SET ROLE api_user;

-- Analyze query with RLS
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM note;

RESET ROLE;
EOF
```

## Testing

### Auth API Unit & Integration Tests

The auth-api includes a comprehensive test suite using Vitest and Supertest.

```bash
cd auth-api

# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run with coverage report
pnpm test:coverage
```

### Test Structure

| File | Type | Coverage |
|------|------|----------|
| `auth.service.test.ts` | Unit | Login flow, JWT generation, error cases |
| `jwt.service.test.ts` | Unit | Token sign/verify/decode, expiration |
| `auth.controller.test.ts` | Integration | HTTP endpoints, middleware, validation |

### Test Fixtures

Tests use realistic data from the seed database (`db/migrations/004_seed.sql`):

```typescript
// src/test/fixtures.ts
ORGS.CYBERTEC    // { id: 'c0000000-...', slug: 'cybertec' }
ORGS.IVAN_CORP   // { id: 'a0000000-...', slug: 'ivan-corp' }

USERS.ARMIN      // Cybertec admin
USERS.SVITLANA   // Cybertec editor
USERS.IVAN       // Ivan Corp admin
```

### Multi-Tenant Test Scenarios

```typescript
// Tests verify tenant isolation
it('should return 401 when user exists but wrong org', async () => {
  // Armin exists in Cybertec, not Ivan Corp
  await request(app)
    .post('/auth/login')
    .send({ email: USERS.ARMIN.email, orgSlug: ORGS.IVAN_CORP.slug })
    .expect(401);
});
```

## Project Structure

```
cypex-multi-tenant/
├── docker-compose.yml          # Service orchestration
├── .env.example                # Environment template
├── README.md                   # This file
│
├── docs/
│   ├── ADR.md                  # Architecture Decision Records
│   ├── pgss.txt                # pg_stat_statements snapshots
│   └── explain.txt             # EXPLAIN ANALYZE results
│
├── db/
│   ├── init.sh                 # Migration orchestrator script
│   └── migrations/
│       ├── 001_schema.sql      # Tables, indexes, views
│       ├── 001a_postgrest_roles.sql  # PostgREST role setup
│       ├── 002_rls.sql         # Row Level Security policies
│       ├── 003_functions.sql   # RPC functions (notes_for_me, create_note)
│       ├── 004_seed.sql        # Test data (2 orgs, 5 users, 7 notes)
│       ├── 005_postgrest_grants.sql  # API permissions
│       └── 006_observability.sql     # pg_stat_statements exposure
│
└── auth-api/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── vitest.config.ts        # Test configuration
    └── src/
        ├── index.ts            # Express app entry point
        ├── config/
        │   ├── env.ts          # Environment configuration
        │   ├── database.ts     # PostgreSQL connection pool
        │   ├── logger.ts       # Pino structured logging
        │   └── openapi.ts      # Swagger/OpenAPI setup
        ├── controllers/
        │   ├── auth.controller.ts    # /auth/* endpoints
        │   └── health.controller.ts  # /health endpoint
        ├── services/
        │   ├── auth.service.ts       # Authentication logic
        │   ├── user.service.ts       # User lookup (uses pgTyped)
        │   └── jwt.service.ts        # Token generation/verification
        ├── queries/
        │   ├── user.sql              # SQL queries (pgTyped source)
        │   └── user.queries.ts       # Generated types (pgTyped output)
        ├── middleware/
        │   ├── auth.middleware.ts    # JWT verification
        │   ├── error-handler.ts      # Global error handling
        │   ├── zod-validation.middleware.ts  # Zod schema validation
        │   └── request-id.middleware.ts  # Request correlation
        ├── dto/                # Zod schemas + inferred types
        ├── errors/             # Custom error classes
        ├── types/
        │   └── jwt.ts          # JWT payload with NoteScope types
        └── test/
            ├── setup.ts        # Test setup (env vars, mocks)
            ├── app.ts          # Test Express app factory
            └── fixtures.ts     # Test data from seed.sql
```

## Security Notes

**This is a demo application - NOT production-ready**

### Current Limitations

- No password verification (login by email only)
- Static JWT secret (should be rotated)
- No rate limiting
- No HTTPS (requires reverse proxy)
- No refresh token rotation

### Production Enhancements Required

1. **Authentication**
   - Add password hashing (bcrypt/argon2)
   - Implement OAuth2/OIDC
   - Add MFA support

2. **Token Security**
   - Implement refresh token rotation
   - Use secure secret management (Vault, AWS Secrets Manager)
   - Add token revocation

3. **Infrastructure**
   - HTTPS termination (nginx, Cloudflare)
   - Rate limiting (nginx, API gateway)
   - WAF protection

4. **Monitoring**
   - Centralized logging (ELK, CloudWatch)
   - APM (Datadog, New Relic)
   - Alerting on security events

### RLS Security Checklist

- [x] RLS enabled on all tenant-scoped tables
- [x] FORCE ROW LEVEL SECURITY enabled
- [x] Policies cover all operations (SELECT, INSERT, UPDATE, DELETE)
- [x] Helper functions are SECURITY DEFINER
- [x] Views use `security_invoker = on`
- [x] Indexes optimized for `org_id` filtering

## License

MIT
