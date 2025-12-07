-- =============================================================================
-- Migration 001: Schema
-- =============================================================================
-- Creates tables, indexes, and database roles

\echo 'Running migration 001_schema.sql...'

-- -----------------------------------------------------------------------------
-- Database Roles
-- -----------------------------------------------------------------------------
-- anon: Anonymous role for unauthenticated requests
-- api_user: Role for authenticated API requests
-- authenticator: PostgREST connection role that switches to others

DO $$
BEGIN
    -- Create anon role if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
        RAISE NOTICE 'Created role: anon';
    END IF;

    -- Create api_user role if not exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'api_user') THEN
        CREATE ROLE api_user NOLOGIN;
        RAISE NOTICE 'Created role: api_user';
    END IF;

    -- Create authenticator role if not exists (PostgREST connection role)
    -- Password is set separately via ALTER ROLE using environment variable
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
        CREATE ROLE authenticator NOINHERIT LOGIN;
        RAISE NOTICE 'Created role: authenticator';
    END IF;
END
$$;

-- Set authenticator password from environment variable (passed via psql -v)
-- This keeps credentials out of version control
ALTER ROLE authenticator WITH PASSWORD :authenticator_password;

-- Grant role switching permissions to authenticator
GRANT anon TO authenticator;
GRANT api_user TO authenticator;

-- -----------------------------------------------------------------------------
-- Schemas
-- -----------------------------------------------------------------------------
-- public: Internal tables and functions
-- api: External interface exposed via PostgREST

CREATE SCHEMA IF NOT EXISTS api;

GRANT USAGE ON SCHEMA public TO anon, api_user;
GRANT USAGE ON SCHEMA api TO anon, api_user;

-- -----------------------------------------------------------------------------
-- Custom Types
-- -----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'editor');
        RAISE NOTICE 'Created type: user_role';
    END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Table: org
-- -----------------------------------------------------------------------------
-- Organizations (tenants) in the multi-tenant system

CREATE TABLE IF NOT EXISTS public.org (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.org IS 'Organizations (tenants) in the multi-tenant system';
COMMENT ON COLUMN public.org.id IS 'Unique identifier for the organization';
COMMENT ON COLUMN public.org.name IS 'Display name of the organization';
COMMENT ON COLUMN public.org.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN public.org.created_at IS 'Timestamp when the organization was created';

-- Indexes for org
CREATE INDEX IF NOT EXISTS idx_org_slug ON public.org(slug);
CREATE INDEX IF NOT EXISTS idx_org_created_at ON public.org(created_at);

-- -----------------------------------------------------------------------------
-- Table: app_user
-- -----------------------------------------------------------------------------
-- Users belonging to organizations

CREATE TABLE IF NOT EXISTS public.app_user (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    role        user_role NOT NULL DEFAULT 'editor',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_app_user_email_org UNIQUE (email, org_id)
);

COMMENT ON TABLE public.app_user IS 'Users belonging to organizations';
COMMENT ON COLUMN public.app_user.id IS 'Unique identifier for the user';
COMMENT ON COLUMN public.app_user.org_id IS 'Organization the user belongs to';
COMMENT ON COLUMN public.app_user.email IS 'User email address';
COMMENT ON COLUMN public.app_user.role IS 'User role within the organization (admin/editor)';
COMMENT ON COLUMN public.app_user.created_at IS 'Timestamp when the user was created';

-- Indexes for app_user (org_id first for RLS efficiency)
CREATE INDEX IF NOT EXISTS idx_app_user_org_id ON public.app_user(org_id);
CREATE INDEX IF NOT EXISTS idx_app_user_email ON public.app_user(email);
CREATE INDEX IF NOT EXISTS idx_app_user_org_role ON public.app_user(org_id, role);

-- -----------------------------------------------------------------------------
-- Table: note
-- -----------------------------------------------------------------------------
-- Notes created by users within organizations

CREATE TABLE IF NOT EXISTS public.note (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id      UUID NOT NULL REFERENCES public.org(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES public.app_user(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    body        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.note IS 'Notes created by users within organizations';
COMMENT ON COLUMN public.note.id IS 'Unique identifier for the note';
COMMENT ON COLUMN public.note.org_id IS 'Organization the note belongs to';
COMMENT ON COLUMN public.note.author_id IS 'User who created the note';
COMMENT ON COLUMN public.note.title IS 'Note title';
COMMENT ON COLUMN public.note.body IS 'Note content';
COMMENT ON COLUMN public.note.created_at IS 'Timestamp when the note was created';
COMMENT ON COLUMN public.note.updated_at IS 'Timestamp when the note was last updated';

-- Indexes for note (org_id first for RLS efficiency)
CREATE INDEX IF NOT EXISTS idx_note_org_id ON public.note(org_id);
CREATE INDEX IF NOT EXISTS idx_note_author_id ON public.note(author_id);
CREATE INDEX IF NOT EXISTS idx_note_org_author ON public.note(org_id, author_id);
CREATE INDEX IF NOT EXISTS idx_note_org_created ON public.note(org_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Trigger: Auto-update updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_note_updated_at ON public.note;
CREATE TRIGGER trg_note_updated_at
    BEFORE UPDATE ON public.note
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- API Views
-- -----------------------------------------------------------------------------
-- Views in api schema that PostgREST will expose
-- SECURITY INVOKER ensures RLS policies are evaluated with the caller's role,
-- not the view owner's role (which would bypass RLS as postgres superuser)

CREATE OR REPLACE VIEW api.org
WITH (security_invoker = on) AS
    SELECT id, name, slug, created_at
    FROM public.org;

CREATE OR REPLACE VIEW api.app_user
WITH (security_invoker = on) AS
    SELECT id, org_id, email, role, created_at
    FROM public.app_user;

CREATE OR REPLACE VIEW api.note
WITH (security_invoker = on) AS
    SELECT id, org_id, author_id, title, body, created_at, updated_at
    FROM public.note;

-- -----------------------------------------------------------------------------
-- Grant Permissions
-- -----------------------------------------------------------------------------

-- Public schema tables - api_user needs access for RLS to work through views
GRANT SELECT ON public.org TO api_user;
GRANT SELECT ON public.app_user TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note TO api_user;

-- API schema views
GRANT SELECT ON api.org TO anon, api_user;
GRANT SELECT ON api.app_user TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.note TO api_user;

-- Allow api_user to use sequences (for INSERTs if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO api_user;

\echo 'Migration 001_schema.sql completed successfully'
