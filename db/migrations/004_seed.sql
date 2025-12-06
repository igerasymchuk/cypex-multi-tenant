-- =============================================================================
-- Migration 004: Seed Data
-- =============================================================================
-- Creates test organizations, users, and notes

\echo 'Running migration 004_seed.sql...'

-- -----------------------------------------------------------------------------
-- Organizations
-- -----------------------------------------------------------------------------
-- Two test organizations for demonstrating tenant isolation

INSERT INTO public.org (id, name, slug) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Cybertec', 'cybertec'),
    ('i0000000-0000-0000-0000-000000000002', 'Ivan Corp', 'ivan-corp')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Users: Cybertec
-- -----------------------------------------------------------------------------
-- armin@cybertec.at - Admin
-- svitlana@cybertec.at - Editor
-- bob@cybertec.at - Editor

INSERT INTO public.app_user (id, org_id, email, role) VALUES
    (
        'c1000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'armin@cybertec.at',
        'admin'
    ),
    (
        'c1000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'svitlana@cybertec.at',
        'editor'
    ),
    (
        'c1000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000001',
        'bob@cybertec.at',
        'editor'
    )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Users: Ivan Corp
-- -----------------------------------------------------------------------------
-- ivan@corp.com - Admin
-- bob@corp.com - Editor

INSERT INTO public.app_user (id, org_id, email, role) VALUES
    (
        'i1000000-0000-0000-0000-000000000001',
        'i0000000-0000-0000-0000-000000000002',
        'ivan@corp.com',
        'admin'
    ),
    (
        'i1000000-0000-0000-0000-000000000002',
        'i0000000-0000-0000-0000-000000000002',
        'bob@corp.com',
        'editor'
    )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Notes: Cybertec
-- -----------------------------------------------------------------------------

INSERT INTO public.note (id, org_id, author_id, title, body) VALUES
    (
        'c2000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001',  -- armin (admin)
        'PostgreSQL 17 Features Review',
        'Analysis of new features in PostgreSQL 17 and upgrade considerations.'
    ),
    (
        'c2000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000001',  -- armin (admin)
        'Team Meeting Notes',
        'Weekly sync: discussed sprint progress, blockers, and upcoming deadlines.'
    ),
    (
        'c2000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000002',  -- svitlana (editor)
        'RLS Performance Benchmarks',
        'Benchmark results comparing RLS overhead across different query patterns.'
    ),
    (
        'c2000000-0000-0000-0000-000000000004',
        'c0000000-0000-0000-0000-000000000001',
        'c1000000-0000-0000-0000-000000000003',  -- bob (editor)
        'Customer Support Ticket Summary',
        'Overview of common issues reported by customers this week.'
    )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Notes: Ivan Corp
-- -----------------------------------------------------------------------------

INSERT INTO public.note (id, org_id, author_id, title, body) VALUES
    (
        'i2000000-0000-0000-0000-000000000001',
        'i0000000-0000-0000-0000-000000000002',
        'i1000000-0000-0000-0000-000000000001',  -- ivan (admin)
        'Product Roadmap Q1 2025',
        'Strategic initiatives and feature priorities for the upcoming quarter.'
    ),
    (
        'i2000000-0000-0000-0000-000000000002',
        'i0000000-0000-0000-0000-000000000002',
        'i1000000-0000-0000-0000-000000000001',  -- ivan (admin)
        'Architecture Decision Record',
        'Documentation of key architectural decisions for the new platform.'
    ),
    (
        'i2000000-0000-0000-0000-000000000003',
        'i0000000-0000-0000-0000-000000000002',
        'i1000000-0000-0000-0000-000000000002',  -- bob (editor)
        'API Integration Guide',
        'Step-by-step guide for integrating with third-party services.'
    )
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- Verification
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    org_count INT;
    user_count INT;
    note_count INT;
BEGIN
    SELECT COUNT(*) INTO org_count FROM public.org;
    SELECT COUNT(*) INTO user_count FROM public.app_user;
    SELECT COUNT(*) INTO note_count FROM public.note;

    RAISE NOTICE 'Seed data summary:';
    RAISE NOTICE '  Organizations: %', org_count;
    RAISE NOTICE '  Users: %', user_count;
    RAISE NOTICE '  Notes: %', note_count;

    IF org_count < 2 THEN
        RAISE WARNING 'Expected at least 2 organizations';
    END IF;

    IF user_count < 5 THEN
        RAISE WARNING 'Expected at least 5 users';
    END IF;

    IF note_count < 7 THEN
        RAISE WARNING 'Expected at least 7 notes';
    END IF;
END
$$;

\echo 'Migration 004_seed.sql completed successfully'

-- -----------------------------------------------------------------------------
-- Quick Reference: Test Users
-- -----------------------------------------------------------------------------
--
-- Cybertec (org: cybertec)
-- ┌──────────────────────┬────────┬──────────────────────────────────────┐
-- │ Email                │ Role   │ User ID                              │
-- ├──────────────────────┼────────┼──────────────────────────────────────┤
-- │ armin@cybertec.at    │ admin  │ c1000000-0000-0000-0000-000000000001 │
-- │ svitlana@cybertec.at │ editor │ c1000000-0000-0000-0000-000000000002 │
-- │ bob@cybertec.at      │ editor │ c1000000-0000-0000-0000-000000000003 │
-- └──────────────────────┴────────┴──────────────────────────────────────┘
--
-- Ivan Corp (org: ivan-corp)
-- ┌──────────────────────┬────────┬──────────────────────────────────────┐
-- │ Email                │ Role   │ User ID                              │
-- ├──────────────────────┼────────┼──────────────────────────────────────┤
-- │ ivan@corp.com        │ admin  │ i1000000-0000-0000-0000-000000000001 │
-- │ bob@corp.com         │ editor │ i1000000-0000-0000-0000-000000000002 │
-- └──────────────────────┴────────┴──────────────────────────────────────┘
--
