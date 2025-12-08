/**
 * Test fixtures based on seed data from db/migrations/004_seed.sql
 */

// =============================================================================
// Organizations
// =============================================================================

export const ORGS = {
  CYBERTEC: {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Cybertec',
    slug: 'cybertec',
  },
  IVAN_CORP: {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'Ivan Corp',
    slug: 'ivan-corp',
  },
} as const;

// =============================================================================
// Users
// =============================================================================

export const USERS = {
  // Cybertec users
  ARMIN: {
    id: 'c1000000-0000-0000-0000-000000000001',
    orgId: ORGS.CYBERTEC.id,
    email: 'armin@cybertec.at',
    role: 'admin' as const,
  },
  SVITLANA: {
    id: 'c1000000-0000-0000-0000-000000000002',
    orgId: ORGS.CYBERTEC.id,
    email: 'svitlana@cybertec.at',
    role: 'editor' as const,
  },
  BOB_CYBERTEC: {
    id: 'c1000000-0000-0000-0000-000000000003',
    orgId: ORGS.CYBERTEC.id,
    email: 'bob@cybertec.at',
    role: 'editor' as const,
  },

  // Ivan Corp users
  IVAN: {
    id: 'a1000000-0000-0000-0000-000000000001',
    orgId: ORGS.IVAN_CORP.id,
    email: 'ivan@corp.com',
    role: 'admin' as const,
  },
  BOB_IVAN_CORP: {
    id: 'a1000000-0000-0000-0000-000000000002',
    orgId: ORGS.IVAN_CORP.id,
    email: 'bob@corp.com',
    role: 'editor' as const,
  },
} as const;

// =============================================================================
// Notes
// =============================================================================

export const NOTES = {
  // Cybertec notes
  POSTGRES_17_REVIEW: {
    id: 'c2000000-0000-0000-0000-000000000001',
    orgId: ORGS.CYBERTEC.id,
    authorId: USERS.ARMIN.id,
    title: 'PostgreSQL 17 Features Review',
  },
  TEAM_MEETING: {
    id: 'c2000000-0000-0000-0000-000000000002',
    orgId: ORGS.CYBERTEC.id,
    authorId: USERS.ARMIN.id,
    title: 'Team Meeting Notes',
  },
  RLS_BENCHMARKS: {
    id: 'c2000000-0000-0000-0000-000000000003',
    orgId: ORGS.CYBERTEC.id,
    authorId: USERS.SVITLANA.id,
    title: 'RLS Performance Benchmarks',
  },

  // Ivan Corp notes
  ROADMAP_Q1: {
    id: 'a2000000-0000-0000-0000-000000000001',
    orgId: ORGS.IVAN_CORP.id,
    authorId: USERS.IVAN.id,
    title: 'Product Roadmap Q1 2025',
  },
} as const;
