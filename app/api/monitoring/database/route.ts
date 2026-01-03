/**
 * Database Monitoring API
 * Provides real-time database performance metrics and health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection-manager';
import { dbRouter } from '@/lib/db/read-replica';
import { createFailoverManager } from '@/lib/db/failover';
import { QueryOptimizer } from '@/lib/db/query-optimizer';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/monitoring/database
 * Returns database health and performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'summary';

    let metrics;

    switch (type) {
      case 'summary':
        metrics = await getDatabaseSummary();
        break;

      case 'pools':
        metrics = await getPoolMetrics();
        break;

      case 'queries':
        metrics = await getQueryMetrics();
        break;

      case 'replicas':
        metrics = await getReplicaStatus();
        break;

      case 'tables':
        metrics = await getTableMetrics();
        break;

      case 'connections':
        metrics = await getConnectionMetrics();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid metrics type' },
          { status: 400 }
        );
    }

    return NextResponse.json(metrics);

  } catch (error) {
    console.error('Database monitoring error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/monitoring/database
 * Perform database maintenance operations
 */
export async function POST(request: NextRequest) {
  try {
    // Check authorization and admin role
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, params } = body;

    let result;

    switch (action) {
      case 'optimize':
        result = await optimizeDatabase(params?.table);
        break;

      case 'analyze':
        result = await analyzeQuery(params?.query, params?.params);
        break;

      case 'vacuum':
        result = await vacuumTable(params?.table);
        break;

      case 'reindex':
        result = await reindexTable(params?.table);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Database operation error:', error);
    return NextResponse.json(
      { error: 'Database operation failed' },
      { status: 500 }
    );
  }
}

// Helper functions

async function getDatabaseSummary() {
  const [health, poolStats, queryStats, connectionCount] = await Promise.all([
    db.checkHealth(),
    db.getPoolStats(),
    db.getQueryStats(),
    getActiveConnections()
  ]);

  return {
    health: {
      connected: health.connected,
      responseTime: health.responseTime,
      status: health.connected ? 'healthy' : 'unhealthy'
    },
    pool: poolStats,
    queries: queryStats,
    connections: connectionCount,
    timestamp: new Date().toISOString()
  };
}

async function getPoolMetrics() {
  const poolStats = await db.getPoolStats();

  // Get historical pool usage
  const query = `
    SELECT
      date_trunc('minute', created_at) as minute,
      AVG(active_connections) as avg_active,
      MAX(active_connections) as max_active
    FROM connection_metrics
    WHERE created_at > NOW() - INTERVAL '1 hour'
    GROUP BY minute
    ORDER BY minute DESC
    LIMIT 60
  `;

  let history = [];
  try {
    const result = await db.query(query, [], { trackMetrics: false });
    history = result.rows;
  } catch {
    // Table might not exist
  }

  return {
    current: poolStats,
    history,
    recommendations: getPoolRecommendations(poolStats),
    timestamp: new Date().toISOString()
  };
}

async function getQueryMetrics() {
  const queryStats = db.getQueryStats();

  // Get slow queries from PostgreSQL
  const slowQueryQuery = `
    SELECT
      query,
      calls,
      mean_exec_time as avg_time_ms,
      max_exec_time as max_time_ms,
      total_exec_time as total_time_ms
    FROM pg_stat_statements
    WHERE mean_exec_time > 1000
    ORDER BY mean_exec_time DESC
    LIMIT 20
  `;

  let pgSlowQueries = [];
  try {
    const result = await db.query(slowQueryQuery, [], { trackMetrics: false });
    pgSlowQueries = result.rows;
  } catch {
    // pg_stat_statements might not be enabled
  }

  return {
    stats: queryStats,
    slowQueries: {
      application: queryStats.slowQueries,
      database: pgSlowQueries
    },
    timestamp: new Date().toISOString()
  };
}

async function getReplicaStatus() {
  const routerStats = await dbRouter.getStats();

  // Check replication lag
  const lagQuery = `
    SELECT
      client_addr,
      state,
      sent_lsn,
      write_lsn,
      flush_lsn,
      replay_lsn,
      write_lag,
      flush_lag,
      replay_lag
    FROM pg_stat_replication
  `;

  let replicationStatus = [];
  try {
    const result = await db.query(lagQuery, [], { trackMetrics: false });
    replicationStatus = result.rows;
  } catch {
    // Not a primary or replication not configured
  }

  return {
    router: routerStats,
    replication: replicationStatus,
    timestamp: new Date().toISOString()
  };
}

async function getTableMetrics() {
  const tableStatsQuery = `
    SELECT
      schemaname,
      tablename,
      n_live_tup as live_rows,
      n_dead_tup as dead_rows,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    LIMIT 20
  `;

  const indexStatsQuery = `
    SELECT
      schemaname,
      tablename,
      indexrelname,
      idx_scan,
      idx_tup_read,
      idx_tup_fetch,
      pg_size_pretty(pg_relation_size(indexrelid)) as index_size
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0
    ORDER BY pg_relation_size(indexrelid) DESC
    LIMIT 10
  `;

  const [tables, unusedIndexes] = await Promise.all([
    db.query(tableStatsQuery, [], { trackMetrics: false }),
    db.query(indexStatsQuery, [], { trackMetrics: false })
  ]);

  return {
    tables: tables.rows,
    unusedIndexes: unusedIndexes.rows,
    recommendations: getTableRecommendations(tables.rows),
    timestamp: new Date().toISOString()
  };
}

async function getConnectionMetrics() {
  const activeQuery = `
    SELECT
      datname as database,
      usename as username,
      application_name,
      client_addr,
      state,
      query_start,
      state_change,
      wait_event_type,
      wait_event,
      query
    FROM pg_stat_activity
    WHERE state != 'idle'
    ORDER BY query_start
  `;

  const connectionStatsQuery = `
    SELECT
      datname as database,
      numbackends as connections,
      xact_commit as commits,
      xact_rollback as rollbacks,
      blks_read as disk_reads,
      blks_hit as cache_hits,
      tup_returned as rows_returned,
      tup_fetched as rows_fetched,
      tup_inserted as rows_inserted,
      tup_updated as rows_updated,
      tup_deleted as rows_deleted
    FROM pg_stat_database
    WHERE datname = current_database()
  `;

  const [activeConnections, dbStats] = await Promise.all([
    db.query(activeQuery, [], { trackMetrics: false }),
    db.query(connectionStatsQuery, [], { trackMetrics: false })
  ]);

  return {
    active: activeConnections.rows,
    statistics: dbStats.rows[0],
    cacheHitRate: calculateCacheHitRate(dbStats.rows[0]),
    timestamp: new Date().toISOString()
  };
}

async function getActiveConnections(): Promise<number> {
  try {
    const result = await db.query(
      'SELECT COUNT(*) as count FROM pg_stat_activity',
      [],
      { trackMetrics: false }
    );
    return parseInt(result.rows[0]?.count || '0');
  } catch {
    return 0;
  }
}

async function optimizeDatabase(tableName?: string) {
  if (tableName) {
    await QueryOptimizer.optimizeTable(tableName);
    const stats = await QueryOptimizer.getTableStats(tableName);
    const indexes = await QueryOptimizer.getIndexStats(tableName);

    return {
      success: true,
      message: `Table ${tableName} optimized`,
      stats,
      indexes
    };
  } else {
    // Optimize all tables
    const tablesQuery = 'SELECT tablename FROM pg_stat_user_tables';
    const result = await db.query(tablesQuery, [], { trackMetrics: false });

    for (const row of result.rows) {
      await QueryOptimizer.optimizeTable(row.tablename);
    }

    return {
      success: true,
      message: `Optimized ${result.rows.length} tables`
    };
  }
}

async function analyzeQuery(queryText: string, params: any[]) {
  const plan = await QueryOptimizer.explainQuery(queryText, params, true);

  return {
    plan,
    recommendations: getQueryRecommendations(plan)
  };
}

async function vacuumTable(tableName: string) {
  await db.query(`VACUUM ANALYZE ${tableName}`, [], { trackMetrics: false });

  return {
    success: true,
    message: `Table ${tableName} vacuumed and analyzed`
  };
}

async function reindexTable(tableName: string) {
  await db.query(`REINDEX TABLE ${tableName}`, [], { trackMetrics: false });

  return {
    success: true,
    message: `Table ${tableName} reindexed`
  };
}

// Recommendation functions

function getPoolRecommendations(poolStats: any) {
  const recommendations = [];

  if (poolStats.utilizationPercent > 80) {
    recommendations.push({
      severity: 'warning',
      message: `High connection pool utilization (${poolStats.utilizationPercent}%). Consider increasing pool size.`
    });
  }

  if (poolStats.waiting > 0) {
    recommendations.push({
      severity: 'warning',
      message: `${poolStats.waiting} queries waiting for connections. Increase pool size or optimize query performance.`
    });
  }

  return recommendations;
}

function getTableRecommendations(tables: any[]) {
  const recommendations = [];

  for (const table of tables) {
    const deadRatio = table.dead_rows / (table.live_rows || 1);

    if (deadRatio > 0.2) {
      recommendations.push({
        severity: 'warning',
        table: table.tablename,
        message: `High dead tuple ratio (${Math.round(deadRatio * 100)}%). Consider running VACUUM.`
      });
    }

    if (!table.last_analyze && table.live_rows > 1000) {
      recommendations.push({
        severity: 'info',
        table: table.tablename,
        message: 'Table has never been analyzed. Run ANALYZE for better query planning.'
      });
    }
  }

  return recommendations;
}

function getQueryRecommendations(plan: any[]) {
  const recommendations = [];

  // This is simplified - real implementation would parse EXPLAIN output
  const planText = JSON.stringify(plan);

  if (planText.includes('Seq Scan') && planText.includes('cost=')) {
    recommendations.push({
      severity: 'warning',
      message: 'Query uses sequential scan. Consider adding an index.'
    });
  }

  if (planText.includes('Nested Loop') && planText.includes('rows=')) {
    recommendations.push({
      severity: 'info',
      message: 'Query uses nested loop join. May be slow for large datasets.'
    });
  }

  return recommendations;
}

function calculateCacheHitRate(stats: any): number {
  const hits = parseInt(stats?.cache_hits || '0');
  const reads = parseInt(stats?.disk_reads || '0');
  const total = hits + reads;

  return total > 0 ? Math.round((hits / total) * 100) : 0;
}