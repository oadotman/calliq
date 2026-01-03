/**
 * Database Connection Manager
 * Optimizes database connections with pooling and monitoring
 * Prevents connection exhaustion and tracks slow queries
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Metrics } from '@/lib/monitoring/metrics';
import { ErrorTracker } from '@/lib/monitoring/error-tracker';

export interface PoolStats {
  total: number;
  idle: number;
  waiting: number;
  active: number;
  maxConnections: number;
  utilizationPercent: number;
}

export interface QueryOptions {
  timeout?: number;
  trackMetrics?: boolean;
  name?: string; // For prepared statements
}

export class ConnectionManager {
  private pool: Pool;
  private readonly maxConnections: number;
  private readonly slowQueryThreshold: number = 1000; // 1 second
  private queryCount: number = 0;
  private totalQueryTime: number = 0;
  private slowQueries: Array<{ query: string; duration: number; timestamp: Date }> = [];

  constructor(connectionString?: string) {
    this.maxConnections = parseInt(process.env.DB_POOL_SIZE || '20');

    // Configure connection pool
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,

      // Pool size configuration
      max: this.maxConnections,
      min: 2, // Minimum connections to maintain

      // Connection timeouts
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 2000, // Fail if connection takes > 2 seconds

      // Statement and query timeouts
      statement_timeout: 30000, // 30 seconds max per statement
      query_timeout: 30000, // 30 seconds max per query

      // Keep alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,

      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false // For Supabase/Heroku
      } : undefined
    });

    // Pool event handlers
    this.setupPoolEventHandlers();

    // Log initial configuration
    console.log(`Database pool initialized with ${this.maxConnections} max connections`);
  }

  /**
   * Execute a query with automatic pooling
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const { timeout, trackMetrics = true, name } = options;

    let client: PoolClient | undefined;

    try {
      // Get a client from the pool
      client = await this.pool.connect();

      // Set custom timeout if provided
      if (timeout) {
        await client.query(`SET statement_timeout = ${timeout}`);
      }

      // Execute query
      const result = name
        ? await client.query<T>({ text, values: params, name })
        : await client.query<T>(text, params);

      const duration = Date.now() - start;

      // Track metrics
      if (trackMetrics) {
        await this.trackQueryMetrics(text, duration, 'success');
      }

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        this.logSlowQuery(text, duration);
      }

      // Update statistics
      this.queryCount++;
      this.totalQueryTime += duration;

      return result;

    } catch (error) {
      const duration = Date.now() - start;

      // Track error metrics
      if (trackMetrics) {
        await this.trackQueryMetrics(text, duration, 'error');
      }

      // Track error
      await ErrorTracker.trackDatabaseError(
        'query',
        error,
        text.substring(0, 200) // Truncate long queries
      ).catch(console.error);

      console.error('Database query error:', {
        query: text.substring(0, 100),
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;

    } finally {
      // Always release the client back to the pool
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    const start = Date.now();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');

      const duration = Date.now() - start;
      await this.trackQueryMetrics('TRANSACTION', duration, 'success');

      return result;

    } catch (error) {
      await client.query('ROLLBACK');

      const duration = Date.now() - start;
      await this.trackQueryMetrics('TRANSACTION', duration, 'error');

      await ErrorTracker.trackDatabaseError(
        'transaction',
        error
      ).catch(console.error);

      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Execute multiple queries in a batch
   */
  async batch<T extends QueryResultRow = any>(
    queries: Array<{ text: string; params?: any[] }>
  ): Promise<QueryResult<T>[]> {
    const client = await this.pool.connect();
    const start = Date.now();
    const results: QueryResult<T>[] = [];

    try {
      await client.query('BEGIN');

      for (const query of queries) {
        const result = await client.query<T>(query.text, query.params);
        results.push(result);
      }

      await client.query('COMMIT');

      const duration = Date.now() - start;
      await this.trackQueryMetrics('BATCH', duration, 'success');

      return results;

    } catch (error) {
      await client.query('ROLLBACK');

      const duration = Date.now() - start;
      await this.trackQueryMetrics('BATCH', duration, 'error');

      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(): Promise<PoolStats> {
    const total = this.pool.totalCount;
    const idle = this.pool.idleCount;
    const waiting = this.pool.waitingCount;
    const active = total - idle;

    return {
      total,
      idle,
      waiting,
      active,
      maxConnections: this.maxConnections,
      utilizationPercent: Math.round((active / this.maxConnections) * 100)
    };
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    const avgQueryTime = this.queryCount > 0
      ? Math.round(this.totalQueryTime / this.queryCount)
      : 0;

    return {
      totalQueries: this.queryCount,
      totalQueryTime: this.totalQueryTime,
      averageQueryTime: avgQueryTime,
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      slowQueryCount: this.slowQueries.length
    };
  }

  /**
   * Check database health
   */
  async checkHealth(): Promise<{
    connected: boolean;
    responseTime: number;
    poolStats: PoolStats;
  }> {
    const start = Date.now();

    try {
      await this.query('SELECT 1', [], { trackMetrics: false });
      const responseTime = Date.now() - start;
      const poolStats = await this.getPoolStats();

      return {
        connected: true,
        responseTime,
        poolStats
      };

    } catch (error) {
      return {
        connected: false,
        responseTime: Date.now() - start,
        poolStats: await this.getPoolStats()
      };
    }
  }

  /**
   * Gracefully shutdown the pool
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down database pool...');
    await this.pool.end();
    console.log('Database pool closed');
  }

  /**
   * Setup pool event handlers
   */
  private setupPoolEventHandlers(): void {
    this.pool.on('connect', (client) => {
      console.log('New database connection established');
    });

    this.pool.on('acquire', (client) => {
      // Client checked out from pool
    });

    this.pool.on('remove', (client) => {
      console.log('Database connection removed from pool');
    });

    this.pool.on('error', (err, client) => {
      console.error('Unexpected database error on idle client', err);
      ErrorTracker.trackDatabaseError(
        'pool_error',
        err
      ).catch(console.error);
    });
  }

  /**
   * Track query metrics
   */
  private async trackQueryMetrics(
    query: string,
    duration: number,
    status: 'success' | 'error'
  ): Promise<void> {
    try {
      // Extract operation type (SELECT, INSERT, UPDATE, DELETE, etc.)
      const operation = query.trim().split(/\s+/)[0].toUpperCase();

      await Metrics.recordDatabaseQuery(operation, duration);

      if (status === 'error') {
        await Metrics.recordError('database', 'QueryError');
      }
    } catch (error) {
      console.error('Failed to track query metrics:', error);
    }
  }

  /**
   * Log slow query
   */
  private logSlowQuery(query: string, duration: number): void {
    console.warn(`Slow query detected (${duration}ms):`, query.substring(0, 200));

    this.slowQueries.push({
      query: query.substring(0, 500), // Truncate for storage
      duration,
      timestamp: new Date()
    });

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries = this.slowQueries.slice(-100);
    }
  }

  /**
   * Optimize pool settings based on usage
   */
  async optimizePool(): Promise<void> {
    const stats = await this.getPoolStats();

    // If we're consistently using > 80% of connections, log a warning
    if (stats.utilizationPercent > 80) {
      console.warn(`High database connection utilization: ${stats.utilizationPercent}%`);
      console.warn(`Consider increasing DB_POOL_SIZE (currently ${this.maxConnections})`);
    }

    // If we have too many idle connections, we could reduce the pool size
    if (stats.idle > this.maxConnections * 0.5 && stats.active < 2) {
      console.log(`Many idle connections: ${stats.idle}/${this.maxConnections}`);
    }
  }
}

// Export singleton instance
export const db = new ConnectionManager();