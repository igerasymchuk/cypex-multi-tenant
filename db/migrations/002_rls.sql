-- =============================================================================
-- Migration 002: Row Level Security
-- =============================================================================
-- Enables RLS and creates policies for tenant isolation

\echo 'Running migration 002_rls.sql...'

-- -----------------------------------------------------------------------------
-- Helper Functions for JWT Claims Extraction
-- -----------------------------------------------------------------------------
-- These functions safely extract claims from the JWT token set by PostgREST
-- PostgREST sets: request.jwt.claims, request.jwt.claim.sub, etc.

-- Get current user's org_id from JWT claims
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(
        current_setting('request.jwt.claims', true)::json->>'org_id',
        ''
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's id (sub claim) from JWT claims
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(
        current_setting('request.jwt.claims', true)::json->>'sub',
        ''
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get current user's role from JWT claims
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN NULLIF(
        current_setting('request.jwt.claims', true)::json->>'role',
        ''
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.current_user_org_id() TO api_user;
GRANT EXECUTE ON FUNCTION public.current_user_id() TO api_user;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO api_user;
GRANT EXECUTE ON FUNCTION public.is_admin() TO api_user;

-- -----------------------------------------------------------------------------
-- Enable Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE public.org ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners too (security best practice)
ALTER TABLE public.org FORCE ROW LEVEL SECURITY;
ALTER TABLE public.app_user FORCE ROW LEVEL SECURITY;
ALTER TABLE public.note FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS Policies: org table
-- -----------------------------------------------------------------------------
-- Users can only see their own organization

DROP POLICY IF EXISTS org_select_policy ON public.org;
CREATE POLICY org_select_policy ON public.org
    FOR SELECT
    TO api_user, admin, editor
    USING (id = public.current_user_org_id());

-- -----------------------------------------------------------------------------
-- RLS Policies: app_user table
-- -----------------------------------------------------------------------------
-- Users can only see other users in their organization

DROP POLICY IF EXISTS app_user_select_policy ON public.app_user;
CREATE POLICY app_user_select_policy ON public.app_user
    FOR SELECT
    TO api_user, admin, editor
    USING (org_id = public.current_user_org_id());

-- -----------------------------------------------------------------------------
-- RLS Policies: note table
-- -----------------------------------------------------------------------------
-- Full CRUD with org isolation, admin-only delete

-- SELECT: Users can only see notes from their organization
DROP POLICY IF EXISTS note_select_policy ON public.note;
CREATE POLICY note_select_policy ON public.note
    FOR SELECT
    TO api_user, admin, editor
    USING (org_id = public.current_user_org_id());

-- INSERT: Users can only create notes in their organization
-- Also enforces that author_id matches the current user
DROP POLICY IF EXISTS note_insert_policy ON public.note;
CREATE POLICY note_insert_policy ON public.note
    FOR INSERT
    TO api_user, admin, editor
    WITH CHECK (
        org_id = public.current_user_org_id()
        AND author_id = public.current_user_id()
    );

-- UPDATE: Users can only update notes in their organization
-- Optional: Could restrict to own notes only with: AND author_id = public.current_user_id()
DROP POLICY IF EXISTS note_update_policy ON public.note;
CREATE POLICY note_update_policy ON public.note
    FOR UPDATE
    TO api_user, admin, editor
    USING (org_id = public.current_user_org_id())
    WITH CHECK (org_id = public.current_user_org_id());

-- DELETE: Only admins can delete notes, and only within their organization
DROP POLICY IF EXISTS note_delete_policy ON public.note;
CREATE POLICY note_delete_policy ON public.note
    FOR DELETE
    TO api_user, admin, editor
    USING (
        org_id = public.current_user_org_id()
        AND public.is_admin()
    );

-- -----------------------------------------------------------------------------
-- Verify RLS is enabled
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('org', 'app_user', 'note')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
            AND c.relname = tbl.tablename
            AND c.relrowsecurity = true
        ) THEN
            RAISE EXCEPTION 'RLS not enabled on table: %', tbl.tablename;
        END IF;
    END LOOP;
    RAISE NOTICE 'RLS verification passed for all tables';
END
$$;

\echo 'Migration 002_rls.sql completed successfully'
