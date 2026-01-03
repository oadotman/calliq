/**
 * Database Read Replica Router
 * Distributes read queries to replica databases for load balancing
 * Ensures write consistency by routing all writes to primary
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { ConnectionManager } from './connection-manager';
import { Metrics } from '@/lib/monitoring/metrics';
import { ErrorTracker } from '@/lib/monitoring/error-tracker';

export interface ReplicaConfig {
  primary: string;
  replicas: string[];
  readPreference?: 'primary' | 'replica' | 'nearest';
  replicaLag?: number; // Maximum acceptable lag in seconds
}

export class DatabaseRouter {
  private primaryDb: ConnectionManager;
  private readReplicas: ConnectionManager[];
  private currentReplicaIndex: number = 0;
  private readPreference: 'primary' | 'replica' | 'nearest';
  private replicaHealthStatus: Map<number, boolean> = new Map();
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval = 30000; // 30 seconds

  constructor(config?: ReplicaConfig) {
    // Initialize primary database
    this.primaryDb = new ConnectionManager(
      config?.primary || process.env.DATABASE_URL
    );

    // Initialize read replicas
    const replicaUrls = config?.replicas || [
      process.env.DATABASE_READ_REPLICA_URL,
      process.env.DATABASE_READ_REPLICA_URL_2
    ].filter(Boolean);

    this.readReplicas = replicaUrls.map(url =>
      url ? new ConnectionManager(url) : null
    ).filter(Boolean) as ConnectionManager[];

    // If no replicas configured, use primary for reads
    if (this.readReplicas.length === 0) {
      console.log('No read replicas configured, using primary for all queries');
      this.readReplicas = [this.primaryDb];
    } else {
      console.log(`Configured with ${this.readReplicas.length} read replica(s)`);
    }

    // Set read preference
    this.readPreference = config?.readPreference || 'replica';

    // Initialize health status
    this.readReplicas.forEach((_, index) => {
      this.replicaHealthStatus.set(index, true);
    });

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Execute a read query (SELECT)
   * Routes to replicas for load distribution
   */
  async read<T extends QueryResultRow = any>(
    query: string,
    params?: any[],
    options: { preferPrimary?: boolean } = {}
  ): Promise<QueryResult<T>> {
    const start = Date.now();

    // Check if we should use primary
    if (options.preferPrimary || this.readPreference === 'primary') {
      return this.primaryDb.query<T>(query, params);
    }

    // Get healthy replica
    const replica = await this.getHealthyReplica();

    try {
      const result = await replica.query<T>(query, params);

      // Track metrics
      const duration = Date.now() - start;
      await Metrics.recordDatabaseQuery('READ_REPLICA', duration);

      return result;

    } catch (error) {
      console.error('Read replica query failed, falling back to primary:', error);

      // Mark replica as unhealthy
      const replicaIndex = this.readReplicas.indexOf(replica);
      if (replicaIndex !== -1) {
        this.replicaHealthStatus.set(replicaIndex, false);
      }

      // Fallback to primary
      return this.primaryDb.query<T>(query, params);
    }
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE)
   * Always routes to primary for consistency
   */
  async write<T extends QueryResultRow = any>(
    query: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();

    try {
      const result = await this.primaryDb.query<T>(query, params);

      // Track metrics
      const duration = Date.now() - start;
      await Metrics.recordDatabaseQuery('WRITE_PRIMARY', duration);

      return result;

    } catch (error) {
      await ErrorTracker.trackDatabaseError(
        'write_primary',
        error,
        query.substring(0, 200)
      );
      throw error;
    }
  }

  /**
   * Execute a transaction (always on primary)
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    return this.primaryDb.transaction(callback);
  }

  /**
   * Smart query router - automatically determines read vs write
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const normalizedQuery = text.trim().toUpperCase();

    // Determine if this is a read or write query
    const isReadQuery = normalizedQuery.startsWith('SELECT') ||
                       normalizedQuery.startsWith('WITH') ||
                       normalizedQuery.startsWith('SHOW') ||
                       normalizedQuery.startsWith('DESCRIBE') ||
                       normalizedQuery.startsWith('EXPLAIN');

    if (isReadQuery) {
      return this.read<T>(text, params);
    } else {
      return this.write<T>(text, params);
    }
  }

  /**
   * Get a healthy read replica using round-robin
   */
  private async getHealthyReplica(): Promise<ConnectionManager> {
    // Check if health check is needed
    if (Date.now() - this.lastHealthCheck > this.healthCheckInterval) {
      await this.checkReplicaHealth();
    }

    // Find next healthy replica
    const totalReplicas = this.readReplicas.length;
    let attempts = 0;

    while (attempts < totalReplicas) {
      const replica = this.readReplicas[this.currentReplicaIndex];
      const isHealthy = this.replicaHealthStatus.get(this.currentReplicaIndex);

      // Move to next replica for round-robin
      this.currentReplicaIndex = (this.currentReplicaIndex + 1) % totalReplicas;

      if (isHealthy && replica) {
        return replica;
      }

      attempts++;
    }

    // If no healthy replicas, use primary
    console.warn('No healthy read replicas available, using primary');
    return this.primaryDb;
  }

  /**
   * Check replica health and lag
   */
  private async checkReplicaHealth(): Promise<void> {
    this.lastHealthCheck = Date.now();

    const healthChecks = this.readReplicas.map(async (replica, index) => {
      try {
        // Skip if it's the primary (when no replicas configured)
        if (replica === this.primaryDb) {
          this.replicaHealthStatus.set(index, true);
          return;
        }

        // Simple health check
        const health = await replica.checkHealth();

        if (!health.connected || health.responseTime > 5000) {
          console.warn(`Read replica ${index} is unhealthy`);
          this.replicaHealthStatus.set(index, false);
          return;
        }

        // Check replication lag (PostgreSQL specific)
        try {
          const result = await replica.query(
            'SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag',
            [],
            { trackMetrics: false }
          );

          const lag = result.rows[0]?.lag;

          if (lag === null) {
            // Not a replica or replication not set up
            this.replicaHealthStatus.set(index, true);
          } else if (lag > 10) {
            // More than 10 seconds lag is concerning
            console.warn(`Read replica ${index} has ${lag}s lag`);
            this.replicaHealthStatus.set(index, lag < 30); // Unhealthy if > 30s lag
          } else {
            this.replicaHealthStatus.set(index, true);
          }
        } catch {
          // Query not supported, assume healthy
          this.replicaHealthStatus.set(index, true);
        }

      } catch (error) {
        console.error(`Read replica ${index} health check failed:`, error);
        this.replicaHealthStatus.set(index, false);
      }
    });

    await Promise.allSettled(healthChecks);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Initial health check
    this.checkReplicaHealth().catch(console.error);

    // Periodic health checks
    setInterval(() => {
      this.checkReplicaHealth().catch(console.error);
    }, this.healthCheckInterval);
  }

  /**
   * Get router statistics
   */
  async getStats() {
    const primaryStats = await this.primaryDb.getPoolStats();
    const primaryQueryStats = this.primaryDb.getQueryStats();

    const replicaStats = await Promise.all(
      this.readReplicas.map(async (replica, index) => ({
        index,
        healthy: this.replicaHealthStatus.get(index) || false,
        poolStats: await replica.getPoolStats(),
        queryStats: replica.getQueryStats()
      }))
    );

    return {
      primary: {
        poolStats: primaryStats,
        queryStats: primaryQueryStats
      },
      replicas: replicaStats,
      routerStats: {
        healthyReplicas: Array.from(this.replicaHealthStatus.values()).filter(h => h).length,
        totalReplicas: this.readReplicas.length,
        readPreference: this.readPreference,
        currentReplicaIndex: this.currentReplicaIndex
      }
    };
  }

  /**
   * Force use of primary for next N queries
   */
  forcePrimary(duration: number = 60000): void {
    const originalPreference = this.readPreference;
    this.readPreference = 'primary';

    console.log(`Forcing primary database usage for ${duration}ms`);

    setTimeout(() => {
      this.readPreference = originalPreference;
      console.log('Restored read preference to:', originalPreference);
    }, duration);
  }

  /**
   * Gracefully shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down database router...');

    await Promise.all([
      this.primaryDb.shutdown(),
      ...this.readReplicas
        .filter(replica => replica !== this.primaryDb)
        .map(replica => replica.shutdown())
    ]);

    console.log('Database router shutdown complete');
  }
}

// Export singleton instance with default configuration
export const dbRouter = new DatabaseRouter();