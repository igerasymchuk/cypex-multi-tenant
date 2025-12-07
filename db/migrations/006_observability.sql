-- =============================================================================
-- Migration 006: Observability
-- =============================================================================
-- Exposes pg_stat_statements and database metrics via API
-- Admin-only access for sensitive query statistics

\echo 'Running migration 006_observability.sql...'

-- -----------------------------------------------------------------------------
-- Function: query_stats
-- -----------------------------------------------------------------------------
-- Exposes pg_stat_statements data with formatted output
-- Accessible via PostgREST as POST /rpc/query_stats (admin only)
-- Uses SECURITY DEFINER to access pg_stat_statements with superuser privileges

CREATE OR REPLACE FUNCTION api.query_stats(max_results integer DEFAULT 100)
RETURNS TABLE(
    queryid bigint,
    query_preview text,
    calls bigint,
    total_time_ms numeric,
    mean_time_ms numeric,
    min_time_ms numeric,
    max_time_ms numeric,
    stddev_time_ms numeric,
    rows bigint,
    shared_blks_hit bigint,
    shared_blks_read bigint,
    cache_hit_ratio numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        pss.queryid,
        LEFT(pss.query, 500) AS query_preview,
        pss.calls,
        ROUND(pss.total_exec_time::numeric, 2) AS total_time_ms,
        ROUND(pss.mean_exec_time::numeric, 2) AS mean_time_ms,
        ROUND(pss.min_exec_time::numeric, 2) AS min_time_ms,
        ROUND(pss.max_exec_time::numeric, 2) AS max_time_ms,
        ROUND(pss.stddev_exec_time::numeric, 2) AS stddev_time_ms,
        pss.rows,
        pss.shared_blks_hit,
        pss.shared_blks_read,
        CASE
            WHEN (pss.shared_blks_hit + pss.shared_blks_read) = 0 THEN 100.00
            ELSE ROUND((pss.shared_blks_hit * 100.0 / (pss.shared_blks_hit + pss.shared_blks_read))::numeric, 2)
        END AS cache_hit_ratio
    FROM pg_stat_statements pss
    JOIN pg_database pd ON pss.dbid = pd.oid
    WHERE pd.datname = current_database()
    ORDER BY pss.total_exec_time DESC
    LIMIT max_results;
$$;

COMMENT ON FUNCTION api.query_stats(integer) IS
    'Query execution statistics from pg_stat_statements (admin only)';

-- Revoke default public access, grant only to admin (contains sensitive query text)
REVOKE ALL ON FUNCTION api.query_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.query_stats(integer) TO admin;

-- -----------------------------------------------------------------------------
-- Function: database_stats
-- -----------------------------------------------------------------------------
-- Returns general database health metrics
-- Accessible via PostgREST as POST /rpc/database_stats

CREATE OR REPLACE FUNCTION api.database_stats()
RETURNS TABLE(
    database_name text,
    database_size text,
    active_connections bigint,
    idle_connections bigint,
    max_connections integer,
    cache_hit_ratio numeric,
    uptime interval
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        current_database()::text,
        pg_size_pretty(pg_database_size(current_database())),
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND datname = current_database()),
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle' AND datname = current_database()),
        current_setting('max_connections')::integer,
        ROUND(
            (SELECT
                CASE
                    WHEN (sum(blks_hit) + sum(blks_read)) = 0 THEN 100
                    ELSE sum(blks_hit) * 100.0 / (sum(blks_hit) + sum(blks_read))
                END
            FROM pg_stat_database
            WHERE datname = current_database())::numeric, 2
        ),
        (SELECT current_timestamp - pg_postmaster_start_time());
$$;

COMMENT ON FUNCTION api.database_stats() IS
    'Returns database health metrics: size, connections, cache hit ratio';

-- Revoke default public access, grant to admin and editor (not sensitive)
REVOKE ALL ON FUNCTION api.database_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.database_stats() TO admin, editor;

-- -----------------------------------------------------------------------------
-- Function: table_stats
-- -----------------------------------------------------------------------------
-- Returns table-level statistics for capacity planning
-- Accessible via PostgREST as POST /rpc/table_stats

CREATE OR REPLACE FUNCTION api.table_stats()
RETURNS TABLE(
    table_name text,
    row_estimate bigint,
    table_size text,
    index_size text,
    total_size text,
    seq_scans bigint,
    idx_scans bigint,
    n_live_tup bigint,
    n_dead_tup bigint,
    last_vacuum timestamp with time zone,
    last_autovacuum timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        schemaname || '.' || relname AS table_name,
        n_live_tup AS row_estimate,
        pg_size_pretty(pg_table_size(relid)) AS table_size,
        pg_size_pretty(pg_indexes_size(relid)) AS index_size,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        seq_scan AS seq_scans,
        idx_scan AS idx_scans,
        n_live_tup,
        n_dead_tup,
        last_vacuum,
        last_autovacuum
    FROM pg_stat_user_tables
    WHERE schemaname IN ('public', 'api')
    ORDER BY pg_total_relation_size(relid) DESC;
$$;

COMMENT ON FUNCTION api.table_stats() IS
    'Returns table statistics: sizes, row counts, scan counts, vacuum info';

-- Revoke default public access, grant only to admin
REVOKE ALL ON FUNCTION api.table_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.table_stats() TO admin;

-- -----------------------------------------------------------------------------
-- Function: reset_query_stats
-- -----------------------------------------------------------------------------
-- Resets pg_stat_statements counters (admin only)
-- Accessible via PostgREST as POST /rpc/reset_query_stats

CREATE OR REPLACE FUNCTION api.reset_query_stats()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
BEGIN
    PERFORM pg_stat_statements_reset();
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Query statistics have been reset',
        'reset_at', current_timestamp
    );
END;
$$;

COMMENT ON FUNCTION api.reset_query_stats() IS
    'Resets all query statistics counters (admin only)';

-- Revoke default public access, grant only to admin
REVOKE ALL ON FUNCTION api.reset_query_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.reset_query_stats() TO admin;

-- -----------------------------------------------------------------------------
-- Function: slow_queries
-- -----------------------------------------------------------------------------
-- Returns queries exceeding a threshold (default 100ms)
-- Accessible via PostgREST as POST /rpc/slow_queries

CREATE OR REPLACE FUNCTION api.slow_queries(threshold_ms numeric DEFAULT 100)
RETURNS TABLE(
    queryid bigint,
    query_preview text,
    calls bigint,
    mean_time_ms numeric,
    max_time_ms numeric,
    total_time_ms numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT
        pss.queryid,
        LEFT(pss.query, 300) AS query_preview,
        pss.calls,
        ROUND(pss.mean_exec_time::numeric, 2) AS mean_time_ms,
        ROUND(pss.max_exec_time::numeric, 2) AS max_time_ms,
        ROUND(pss.total_exec_time::numeric, 2) AS total_time_ms
    FROM pg_stat_statements pss
    JOIN pg_database pd ON pss.dbid = pd.oid
    WHERE pd.datname = current_database()
      AND pss.mean_exec_time > threshold_ms
    ORDER BY pss.mean_exec_time DESC
    LIMIT 50;
$$;

COMMENT ON FUNCTION api.slow_queries(numeric) IS
    'Returns queries with mean execution time above threshold (default 100ms)';

-- Revoke default public access, grant only to admin
REVOKE ALL ON FUNCTION api.slow_queries(numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION api.slow_queries(numeric) TO admin;

\echo 'Migration 006_observability.sql completed successfully'
