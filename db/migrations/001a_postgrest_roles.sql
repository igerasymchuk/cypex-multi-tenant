-- =============================================================================
-- Migration 001a: PostgREST Role Creation
-- =============================================================================
-- Creates database roles that match JWT role claims (admin, editor)
-- Must run before 002_rls.sql which references these roles in policies

\echo 'Running migration 001a_postgrest_roles.sql...'

-- -----------------------------------------------------------------------------
-- Database Roles for JWT Claims
-- -----------------------------------------------------------------------------
-- PostgREST switches to the role specified in the JWT 'role' claim
-- We create admin/editor roles that inherit api_user permissions

DO $$
BEGIN
    -- Create admin role if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'admin') THEN
        CREATE ROLE admin NOLOGIN INHERIT;
        RAISE NOTICE 'Created role: admin';
    END IF;

    -- Create editor role if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'editor') THEN
        CREATE ROLE editor NOLOGIN INHERIT;
        RAISE NOTICE 'Created role: editor';
    END IF;
END
$$;

-- Both roles inherit permissions from api_user
GRANT api_user TO admin;
GRANT api_user TO editor;

-- Grant role switching permissions to authenticator
GRANT admin TO authenticator;
GRANT editor TO authenticator;

\echo 'Migration 001a_postgrest_roles.sql completed successfully'
