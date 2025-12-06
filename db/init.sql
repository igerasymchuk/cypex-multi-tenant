-- =============================================================================
-- CYPEX Multi-Tenant Demo - Database Initialization
-- =============================================================================
-- This file orchestrates the execution of all migrations in order.
-- It is mounted to /docker-entrypoint-initdb.d/ and runs on first container start.

\echo '============================================='
\echo 'CYPEX Multi-Tenant Demo - Database Setup'
\echo '============================================='

-- Enable required extensions
\echo 'Enabling extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Run migrations in order
\echo 'Running migrations...'

\ir migrations/001_schema.sql
\ir migrations/002_rls.sql
\ir migrations/003_functions.sql
\ir migrations/004_seed.sql

\echo '============================================='
\echo 'Database setup complete!'
\echo '============================================='
