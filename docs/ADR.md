# Architecture Decision Records (ADR)

This document captures the key architectural decisions made for the CYPEX Multi-Tenant Demo project.

---

## ADR-001: Multi-Tenancy Strategy - Shared Schema with RLS

### Status
Accepted

### Context
We need to isolate data between organizations (tenants) while maintaining operational simplicity. Three common approaches exist:
1. **Database per tenant** - Complete isolation, highest overhead
2. **Schema per tenant** - Good isolation, moderate complexity
3. **Shared schema with RLS** - Lowest overhead, requires careful policy design

### Decision
Use **shared schema with Row Level Security (RLS)** and `org_id` discriminator column.

### Rationale
- **Operational simplicity**: Single database, unified migrations, easier backups
- **Cost efficiency**: No per-tenant resource overhead
- **PostgreSQL native**: RLS is battle-tested and performant with proper indexing
- **Query efficiency**: Composite indexes on `(org_id, ...)` enable efficient tenant-scoped queries

### Consequences
- All tables must include `org_id` column
- RLS policies must be comprehensive and tested
- Indexes must be designed with `org_id` prefix for optimal performance
- Application cannot bypass RLS (by design)

### Trade-offs
- Risk of policy misconfiguration exposing data (mitigated by thorough testing)
- Slightly more complex query planning (mitigated by proper indexing)

---

## ADR-002: API Architecture - PostgREST + Auth Service

### Status
Accepted

### Context
We need to expose CRUD operations with RLS enforcement and handle authentication.

### Decision
- **PostgREST** for all data operations (CRUD + RPC)
- **Node.js Auth Service** for authentication/JWT issuance only

### Rationale
- PostgREST automatically respects RLS policies
- PostgREST generates RESTful API from database schema
- Separation of concerns: Auth service doesn't need data access logic
- Reduced attack surface: Auth service has minimal database exposure

### Consequences
- PostgREST configuration must match JWT claims structure
- Database schema design impacts API shape directly
- Custom business logic requires PostgreSQL functions (RPC)

### Trade-offs
- Less flexibility than custom API (acceptable for this scope)
- Schema changes = API changes (intentional coupling)

---

## ADR-003: JWT Claims Structure

### Status
Accepted

### Context
PostgREST extracts JWT claims via `current_setting('request.jwt.claims')`. We need to decide what claims to include.

### Decision
Include the following claims in JWT:
```json
{
  "sub": "user-uuid",
  "org_id": "org-uuid",
  "role": "admin|editor",
  "scopes": ["notes:read", "notes:write"],
  "iss": "cypex-hire",
  "aud": "postgrest",
  "exp": 1234567890
}
```

### Rationale
- `org_id` in token avoids database lookup per request
- `role` enables role-based policies (admin delete)
- `scopes` prepared for future fine-grained permissions
- Standard claims (`iss`, `aud`, `exp`) for security best practices

### Consequences
- Token size increases (~200 bytes)
- Role/org changes require new token
- 15-minute expiry limits stale permission window

### Trade-offs
- Larger tokens vs. database lookups per request
- Stale permissions for up to 15 minutes (acceptable for demo)

---

## ADR-004: Database User Roles

### Status
Accepted

### Context
PostgreSQL requires proper role separation for security.

### Decision
Create three database roles:
1. **postgres** - Superuser for migrations/admin
2. **api_user** - PostgREST connection role (limited privileges)
3. **anon** - Anonymous role (minimal access, pre-auth)

### Rationale
- Principle of least privilege
- PostgREST requires explicit role switching
- Anonymous access needed for health checks

### Consequences
- Migrations run as superuser
- PostgREST connects as `api_user`, switches to `anon` or authenticated role
- Permissions must be explicitly granted per table/function

---

## ADR-005: Schema Organization

### Status
Accepted

### Context
PostgreSQL supports multiple schemas within a database.

### Decision
Use two schemas:
1. **public** - Internal tables, functions, types
2. **api** - Views/functions exposed via PostgREST

### Rationale
- Clear separation between internal and external interfaces
- PostgREST only exposes `api` schema
- Internal refactoring doesn't affect API contract

### Consequences
- Views in `api` schema wrap `public` tables
- RLS applies at table level (public schema)
- Search path configuration required

---

## ADR-006: Authentication Flow

### Status
Accepted

### Context
Need secure authentication without storing passwords in demo scope.

### Decision
Simplified auth flow for demo:
1. User provides `email` + `orgSlug`
2. Auth service verifies user exists in org
3. JWT issued if valid (no password check in demo)

### Rationale
- Demo focuses on RLS, not auth complexity
- Easy to extend with password/OAuth later
- Sufficient to demonstrate tenant isolation

### Consequences
- NOT production-ready authentication
- Must be enhanced with password verification for real use
- Clear documentation that this is demo-only

### Production Enhancement Path
```typescript
// Future: Add password verification
const user = await userService.verifyCredentials(email, password);
```

---

## ADR-007: Logging Strategy

### Status
Accepted

### Context
Need structured logging for observability.

### Decision
- JSON structured logging
- Log levels: error, warn, info, debug
- Include correlation IDs where applicable

### Rationale
- JSON logs are machine-parseable
- Easy integration with log aggregators (ELK, CloudWatch)
- Consistent format across services

### Implementation
```typescript
logger.info({ event: 'login_success', userId: user.id, orgId: user.orgId });
```

---

## ADR-008: Technology Choices

### Status
Accepted

### Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Database | PostgreSQL 16 | Latest stable, native RLS, pg_stat_statements |
| API | PostgREST 12.2 | Automatic REST from schema, RLS support |
| Runtime | Node.js 22 LTS | Latest LTS, TypeScript support |
| Framework | Express | Minimal, well-documented, flexible |
| Validation | Zod | TypeScript-native schema validation, inferred types |
| SQL | pgTyped | Type-safe SQL with compile-time checking |
| JWT | jsonwebtoken | Industry standard, well-maintained |
| Testing | Vitest + Supertest | Fast, TypeScript-native, built-in mocking |

---

## ADR-009: Index Strategy

### Status
Accepted

### Context
RLS with `org_id` filtering requires optimized indexes.

### Decision
Create composite indexes with `org_id` as leading column:
```sql
CREATE INDEX idx_note_org_id ON note(org_id);
CREATE INDEX idx_note_org_author ON note(org_id, author_id);
CREATE INDEX idx_app_user_org_id ON app_user(org_id);
CREATE INDEX idx_app_user_email ON app_user(email);
```

### Rationale
- RLS filters always include `org_id`
- Leading column in composite index enables efficient range scans
- Covers common query patterns

### Consequences
- Slightly increased write overhead
- Improved read performance for tenant-scoped queries

---

## ADR-010: Error Handling Strategy

### Status
Accepted

### Context
Need consistent error responses across services.

### Decision
Standardized error response format:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### HTTP Status Codes
| Scenario | Status | Code |
|----------|--------|------|
| Validation failed | 400 | VALIDATION_ERROR |
| Not authenticated | 401 | UNAUTHORIZED |
| Not authorized | 403 | FORBIDDEN |
| Not found | 404 | NOT_FOUND |
| Server error | 500 | INTERNAL_ERROR |

### Rationale
- Consistent client experience
- Machine-readable error codes
- Human-readable messages for debugging

---

## ADR-011: Observability with pg_stat_statements

### Status
Accepted

### Context
Need visibility into query performance and database health for debugging and capacity planning.

### Decision
Enable `pg_stat_statements` extension and expose metrics via API.

### Configuration
```yaml
# docker-compose.yml postgres command
- "shared_preload_libraries=pg_stat_statements"
- "pg_stat_statements.track=all"
- "pg_stat_statements.max=10000"
- "pg_stat_statements.track_utility=on"
```

### API Endpoints (via PostgREST)

| Endpoint | Access | Description |
|----------|--------|-------------|
| `POST /rpc/query_stats` | admin | All query statistics |
| `POST /rpc/database_stats` | admin, editor | DB size, connections, cache ratio |
| `POST /rpc/table_stats` | admin | Table sizes, row counts, vacuum info |
| `POST /rpc/slow_queries` | admin | Queries above threshold (default 100ms) |
| `POST /rpc/reset_query_stats` | admin | Reset all query counters |

### Usage Examples
```bash
# Get database overview
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/rpc/database_stats

# View query stats (top 20 by total time)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"max_results": 20}' \
  http://localhost:3000/rpc/query_stats

# Find slow queries (mean > 50ms)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"threshold_ms": 50}' \
  http://localhost:3000/rpc/slow_queries
```

### Rationale
- Native PostgreSQL feature with minimal overhead (~2-5%)
- No external monitoring infrastructure required
- Useful for identifying slow queries and missing indexes
- Admin-only access protects sensitive query text

### Consequences
- Query text stored in shared memory (contains potentially sensitive data)
- Stats reset on PostgreSQL restart
- Requires periodic reset to prevent stale data accumulation

### Security Considerations
- Only `admin` role can view query statistics (may contain user data)
- Both roles can view aggregate database stats (non-sensitive)
- Reset function restricted to admin only

---

## ADR-012: Request Validation with Zod

### Status
Accepted

### Context
Need robust request validation with TypeScript integration. Options considered:
1. **class-validator** - Decorator-based, requires class instantiation
2. **Joi** - Mature, but poor TypeScript integration
3. **Zod** - TypeScript-first, schema-to-type inference

### Decision
Use **Zod** for all request/response validation with custom Express middleware.

### Implementation
```typescript
// Schema definition with automatic type inference
export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  orgSlug: z.string().min(1, 'Organization slug is required'),
});

// Type is automatically inferred
export type LoginRequestDto = z.infer<typeof LoginRequestSchema>;

// Middleware validates and replaces req.body with parsed data
app.post('/auth/login', zodValidate(LoginRequestSchema), controller.login);
```

### Rationale
- Single source of truth for types and validation
- No decorators or class instantiation required
- Excellent error messages out of the box
- Composable schemas for complex validation
- Runtime validation matches compile-time types

### Consequences
- Schemas define both validation and types
- Middleware transforms request body to validated type
- Validation errors return structured field-level details

---

## ADR-013: Type-Safe SQL with pgTyped

### Status
Accepted

### Context
Need type-safe database queries without ORM overhead. Options:
1. **Raw pg client** - No type safety, SQL injection risk
2. **Prisma/TypeORM** - Full ORM, abstracts SQL, migration overhead
3. **pgTyped** - Type generation from SQL files, compile-time checking

### Decision
Use **pgTyped** for type-safe SQL queries with compile-time type generation.

### Implementation
```sql
-- src/queries/user.sql
/* @name FindByEmailAndOrgSlug */
SELECT u.id, u.org_id, u.email, u.role, u.created_at
FROM public.app_user u
JOIN public.org o ON o.id = u.org_id
WHERE u.email = :email AND o.slug = :orgSlug;
```

```typescript
// Generated: src/queries/user.queries.ts
export interface IFindByEmailAndOrgSlugParams {
  email?: string | null | void;
  orgSlug?: string | null | void;
}

export interface IFindByEmailAndOrgSlugResult {
  id: string;
  orgId: string;
  email: string;
  role: user_role;
  createdAt: Date;
}

// Usage
const users = await findByEmailAndOrgSlug.run({ email, orgSlug }, pool);
```

### Rationale
- Write raw SQL (full PostgreSQL feature access)
- Compile-time type checking catches mismatches
- No runtime overhead (just parameterized queries)
- Generated types match actual database schema
- IDE autocomplete for query parameters and results

### Consequences
- Must run `pgtyped` after SQL file changes
- SQL files are the source of truth
- Types regenerated on build

---

## ADR-014: Organization Slug for Authentication

### Status
Accepted

### Context
Original login required `org_id` (UUID) which is not user-friendly. Users should authenticate using memorable organization identifiers.

### Decision
Use **organization slug** instead of UUID for login requests.

### Implementation
```typescript
// Login request now uses slug
{
  "email": "armin@cybertec.at",
  "orgSlug": "cybertec"
}

// SQL joins org table to resolve slug to org_id
SELECT u.id, u.org_id, u.email, u.role
FROM public.app_user u
JOIN public.org o ON o.id = u.org_id
WHERE u.email = :email AND o.slug = :orgSlug;
```

### Rationale
- User-friendly identifiers (e.g., "cybertec" vs "c0000000-0000-0000-0000-000000000001")
- Org slug is unique constraint in database
- JWT still contains `org_id` for RLS compatibility

### Consequences
- Login API changed (breaking change)
- Org table requires unique `slug` column
- User lookup includes org join

---

## ADR-015: JWT Permission Scopes

### Status
Accepted

### Context
Need fine-grained permissions beyond role-based access (admin/editor).

### Decision
Add typed **scopes** array to JWT claims for permission checking.

### Implementation
```typescript
// Defined scope types
export type NoteScope = 'notes:read' | 'notes:write';

// JWT claims include scopes
export interface JwtPayload {
  sub: string;
  org_id: string;
  role: string;
  scopes: NoteScope[];  // Permission array
  email: string;
  // ... standard claims
}

// Service determines scopes based on role
private getScopesForRole(role: string): NoteScope[] {
  return role === 'admin'
    ? ['notes:read', 'notes:write']
    : ['notes:read'];
}
```

### Rationale
- Prepared for future scope-based authorization
- TypeScript union types ensure valid scope values
- Decouples permissions from role names
- PostgREST can check scopes via JWT claims

### Consequences
- Token size increases slightly
- Scopes derived from role at token generation
- Future: RLS policies can check specific scopes

---

## ADR-016: Testing Strategy with Vitest

### Status
Accepted

### Context
Need a testing framework for the Auth API that supports TypeScript, mocking, and integrates well with the existing stack (Express, TypeDI, routing-controllers).

Options considered:
1. **Jest** - Mature, widely used, requires ts-jest setup
2. **Mocha + Chai** - Flexible, requires multiple packages
3. **Vitest** - Vite-native, ESM-first, built-in TypeScript support

### Decision
Use **Vitest** with **Supertest** for unit and integration testing.

### Implementation

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],
  },
});
```

### Test Structure

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Vitest + vi.mock | Service logic, JWT operations |
| Integration | Supertest | HTTP endpoints, middleware chain |
| Fixtures | fixtures.ts | Seed data for realistic tests |

### TypeDI Mocking Pattern

routing-controllers requires special handling for dependency injection mocking:

```typescript
beforeEach(() => {
  Container.reset();

  // Create mocks
  mockAuthService = { login: vi.fn() } as unknown as AuthService;

  // Register in container
  Container.set({ id: AuthService, value: mockAuthService });

  // CRITICAL: Pre-instantiate controller with mocked deps
  const controller = new AuthController(mockAuthService);
  Container.set({ id: AuthController, value: controller });

  app = createTestApp();
});
```

### Test Fixtures from Seed Data

Tests use the same data as the seed migration for consistency:

```typescript
// src/test/fixtures.ts - mirrors db/migrations/004_seed.sql
export const USERS = {
  ARMIN: { id: 'c1000000-...', email: 'armin@cybertec.at', role: 'admin' },
  IVAN: { id: 'a1000000-...', email: 'ivan@corp.com', role: 'admin' },
};
```

### Rationale
- **Fast execution**: Vitest is significantly faster than Jest
- **Native TypeScript**: No transpilation config needed
- **ESM support**: Aligns with Node.js ecosystem direction
- **Built-in mocking**: `vi.mock()` and `vi.fn()` work seamlessly
- **Watch mode**: Instant feedback during development

### Consequences
- Tests run with `pnpm test` (watch) or `pnpm test:run` (CI)
- Coverage reports generated with `pnpm test:coverage`
- Test files co-located with source (`*.test.ts`)
- Setup file configures environment variables and logger mocks

### Test Commands

```bash
pnpm test           # Watch mode
pnpm test:run       # Single run (CI)
pnpm test:coverage  # With coverage report
```

---

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/16/ddl-rowsecurity.html)
- [PostgREST Documentation](https://postgrest.org/en/stable/)
- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [pg_stat_statements Documentation](https://www.postgresql.org/docs/16/pgstatstatements.html)
- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
