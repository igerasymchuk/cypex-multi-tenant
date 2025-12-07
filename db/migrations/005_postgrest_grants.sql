-- =============================================================================
-- Migration 005: PostgREST Role Grants
-- =============================================================================
-- Grants permissions to admin/editor roles on schemas, tables, views, functions
-- Must run after all functions and views are created

\echo 'Running migration 005_postgrest_grants.sql...'

-- -----------------------------------------------------------------------------
-- Schema and Object Access for JWT Roles
-- -----------------------------------------------------------------------------
-- Explicit grants ensure permissions work correctly with role switching

GRANT USAGE ON SCHEMA public TO admin, editor;
GRANT USAGE ON SCHEMA api TO admin, editor;

-- Grant same permissions as api_user on public schema tables
GRANT SELECT ON public.org TO admin, editor;
GRANT SELECT ON public.app_user TO admin, editor;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note TO admin, editor;

-- Grant same permissions as api_user on api schema views
GRANT SELECT ON api.org TO admin, editor;
GRANT SELECT ON api.app_user TO admin, editor;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.note TO admin, editor;

-- Grant execute on helper functions (from 002_rls.sql)
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO admin, editor;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO admin, editor;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO admin, editor;
GRANT EXECUTE ON FUNCTION public.is_admin() TO admin, editor;

-- Grant execute on RPC functions (from 003_functions.sql)
GRANT EXECUTE ON FUNCTION api.notes_for_me() TO admin, editor;
GRANT EXECUTE ON FUNCTION api.create_note(TEXT, TEXT) TO admin, editor;

-- Grant sequence usage for INSERTs
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO admin, editor;

-- -----------------------------------------------------------------------------
-- Verify Role Configuration
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT rolname FROM pg_roles
        WHERE rolname IN ('admin', 'editor', 'api_user', 'authenticator', 'anon')
    LOOP
        RAISE NOTICE 'Role exists: %', r.rolname;
    END LOOP;

    -- Verify authenticator can switch to required roles
    IF NOT EXISTS (
        SELECT 1 FROM pg_auth_members
        WHERE roleid = (SELECT oid FROM pg_roles WHERE rolname = 'admin')
        AND member = (SELECT oid FROM pg_roles WHERE rolname = 'authenticator')
    ) THEN
        RAISE WARNING 'authenticator cannot switch to admin role';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_auth_members
        WHERE roleid = (SELECT oid FROM pg_roles WHERE rolname = 'editor')
        AND member = (SELECT oid FROM pg_roles WHERE rolname = 'authenticator')
    ) THEN
        RAISE WARNING 'authenticator cannot switch to editor role';
    END IF;

    RAISE NOTICE 'Role configuration verified';
END
$$;

\echo 'Migration 005_postgrest_grants.sql completed successfully'
