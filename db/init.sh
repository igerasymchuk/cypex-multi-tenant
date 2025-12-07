#!/bin/bash
# =============================================================================
# CYPEX Multi-Tenant Demo - Database Initialization
# =============================================================================
# This script runs during first container start via docker-entrypoint-initdb.d
# It passes environment variables to psql for secure credential handling

set -e

echo "============================================="
echo "CYPEX Multi-Tenant Demo - Database Setup"
echo "============================================="

# Use environment variable or default
AUTHENTICATOR_PASSWORD="${POSTGREST_DB_PASSWORD:-fallback-api-password}"

# Run psql with the password variable
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v authenticator_password="'$AUTHENTICATOR_PASSWORD'" <<-EOSQL

-- Enable required extensions
\echo 'Enabling extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Run migrations in order
-- Note: 001a creates roles needed by RLS policies, 005 adds grants after functions exist
\echo 'Running migrations...'
\ir /docker-entrypoint-initdb.d/migrations/001_schema.sql
\ir /docker-entrypoint-initdb.d/migrations/001a_postgrest_roles.sql
\ir /docker-entrypoint-initdb.d/migrations/002_rls.sql
\ir /docker-entrypoint-initdb.d/migrations/003_functions.sql
\ir /docker-entrypoint-initdb.d/migrations/004_seed.sql
\ir /docker-entrypoint-initdb.d/migrations/005_postgrest_grants.sql
\ir /docker-entrypoint-initdb.d/migrations/006_observability.sql

\echo '============================================='
\echo 'Database setup complete!'
\echo '============================================='

EOSQL
