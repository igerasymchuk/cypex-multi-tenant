-- =============================================================================
-- Migration 003: Functions
-- =============================================================================
-- Creates RPC functions for API

\echo 'Running migration 003_functions.sql...'

-- -----------------------------------------------------------------------------
-- Function: notes_for_me
-- -----------------------------------------------------------------------------
-- Returns all notes created by the current user (JWT subject)
-- This function is exposed via PostgREST as POST /rpc/notes_for_me
-- RLS is automatically applied since we query the note table

CREATE OR REPLACE FUNCTION api.notes_for_me()
RETURNS SETOF public.note AS $$
BEGIN
    -- Return notes where author_id matches the current user's id from JWT
    -- RLS policies will also filter by org_id automatically
    RETURN QUERY
    SELECT n.*
    FROM public.note n
    WHERE n.author_id = public.current_user_id()
    ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION api.notes_for_me() IS
    'Returns all notes authored by the current user (from JWT sub claim)';

GRANT EXECUTE ON FUNCTION api.notes_for_me() TO api_user;

-- -----------------------------------------------------------------------------
-- Function: create_note
-- -----------------------------------------------------------------------------
-- Convenience function that auto-fills org_id and author_id from JWT
-- This makes it easier for clients to create notes without knowing their IDs

CREATE OR REPLACE FUNCTION api.create_note(
    p_title TEXT,
    p_body TEXT DEFAULT NULL
)
RETURNS public.note AS $$
DECLARE
    v_org_id UUID;
    v_author_id UUID;
    v_note public.note;
BEGIN
    -- Get org_id and author_id from JWT claims
    v_org_id := public.current_user_org_id();
    v_author_id := public.current_user_id();

    -- Validate we have required claims
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Missing org_id in JWT claims';
    END IF;

    IF v_author_id IS NULL THEN
        RAISE EXCEPTION 'Missing sub (user id) in JWT claims';
    END IF;

    -- Insert the note (RLS will validate org_id matches)
    INSERT INTO public.note (org_id, author_id, title, body)
    VALUES (v_org_id, v_author_id, p_title, p_body)
    RETURNING * INTO v_note;

    RETURN v_note;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY INVOKER;

COMMENT ON FUNCTION api.create_note(TEXT, TEXT) IS
    'Create a new note with org_id and author_id auto-filled from JWT';

GRANT EXECUTE ON FUNCTION api.create_note(TEXT, TEXT) TO api_user;

\echo 'Migration 003_functions.sql completed successfully'
