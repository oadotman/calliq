/**
 * Database Failover Manager
 * Ensures database continuity during outages with automatic failover
 * Monitors primary health and switches to secondary when needed
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { ConnectionManager } from './connection-manager';
import { Metrics } from '@/lib/monitoring/metrics';
import { AlertManager } from '@/lib/monitoring/alerts';
import { ErrorTracker } from '@/lib/monitoring/error-tracker';

export interface FailoverConfig {
  primary: string;
  secondary: string;
  tertiary?: string; // Optional third database
  healthCheckInterval?: number;
  failoverThreshold?: number; // Number of failures before switching
  recoveryCheckInterval?: number;
  autoFailback?: boolean; // Automatically switch back to primary when recovered
}

export enum DatabaseRole {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary'
}

export interface DatabaseHealth {
  role: DatabaseRole;
  healthy: boolean;
  lastCheck: Date;
  responseTime: number;
  failureCount: number;
  connectionString: string;
}

export class DatabaseFailover {
  private databases: Map<DatabaseRole, ConnectionManager> = new Map();
  private healthStatus: Map<DatabaseRole, DatabaseHealth> = new Map();
  private currentDatabase: DatabaseRole = DatabaseRole.PRIMARY;
  private failoverInProgress: boolean = false;
  private healthCheckInterval: number;
  private failoverThreshold: number;
  private recoveryCheckInterval: number;
  private autoFailback: boolean;
  private healthCheckTimer?: NodeJS.Timeout;
  private recoveryCheckTimer?: NodeJS.Timeout;

  constructor(config: FailoverConfig) {
    // Initialize databases
    this.databases.set(
      DatabaseRole.PRIMARY,
      new ConnectionManager(config.primary)
    );
    this.databases.set(
      DatabaseRole.SECONDARY,
      new ConnectionManager(config.secondary)
    );

    if (config.tertiary) {
      this.databases.set(
        DatabaseRole.TERTIARY,
        new ConnectionManager(config.tertiary)
      );
    }

    // Initialize health status
    this.databases.forEach((db, role) => {
      this.healthStatus.set(role, {
        role,
        healthy: true,
        lastCheck: new Date(),
        responseTime: 0,
        failureCount: 0,
        connectionString: role === DatabaseRole.PRIMARY ? config.primary :
                        role === DatabaseRole.SECONDARY ? config.secondary :
                        config.tertiary || ''
      });
    });

    // Configuration
    this.healthCheckInterval = config.healthCheckInterval || 10000; // 10 seconds
    this.failoverThreshold = config.failoverThreshold || 3;
    this.recoveryCheckInterval = config.recoveryCheckInterval || 30000; // 30 seconds
    this.autoFailback = config.autoFailback !== false; // Default true

    // Start monitoring
    this.startHealthMonitoring();

    console.log('Database failover manager initialized');
    console.log(`Primary: ${config.primary.substring(0, 30)}...`);
    console.log(`Secondary: ${config.secondary.substring(0, 30)}...`);
    if (config.tertiary) {
      console.log(`Tertiary: ${config.tertiary.substring(0, 30)}...`);
    }
  }

  /**
   * Execute a query with automatic failover
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    // Wait if failover is in progress
    if (this.failoverInProgress) {
      await this.waitForFailover();
    }

    const currentDb = this.databases.get(this.currentDatabase);
    if (!currentDb) {
      throw new Error('No database available');
    }

    try {
      const result = await currentDb.query<T>(text, params);

      // Reset failure count on success
      const health = this.healthStatus.get(this.currentDatabase);
      if (health) {
        health.failureCount = 0;
      }

      return result;

    } catch (error) {
      console.error(`Query failed on ${this.currentDatabase}:`, error);

      // Increment failure count
      const health = this.healthStatus.get(this.currentDatabase);
      if (health) {
        health.failureCount++;

        // Check if we need to failover
        if (health.failureCount >= this.failoverThreshold) {
          await this.performFailover();

          // Retry query on new database
          return this.query<T>(text, params);
        }
      }

      throw error;
    }
  }

  /**
   * Execute a transaction with failover support
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    if (this.failoverInProgress) {
      await this.waitForFailover();
    }

    const currentDb = this.databases.get(this.currentDatabase);
    if (!currentDb) {
      throw new Error('No database available');
    }

    try {
      return await currentDb.transaction(callback);
    } catch (error) {
      console.error(`Transaction failed on ${this.currentDatabase}:`, error);

      const health = this.healthStatus.get(this.currentDatabase);
      if (health) {
        health.failureCount++;

        if (health.failureCount >= this.failoverThreshold) {
          await this.performFailover();

          // Retry transaction on new database
          return this.transaction(callback);
        }
      }

      throw error;
    }
  }

  /**
   * Perform database failover
   */
  private async performFailover(): Promise<void> {
    if (this.failoverInProgress) {
      return;
    }

    this.failoverInProgress = true;
    const originalDatabase = this.currentDatabase;

    try {
      console.log(`Initiating failover from ${originalDatabase}...`);

      // Mark current database as unhealthy
      const currentHealth = this.healthStatus.get(this.currentDatabase);
      if (currentHealth) {
        currentHealth.healthy = false;
      }

      // Find next healthy database
      const nextDatabase = await this.findHealthyDatabase();

      if (!nextDatabase) {
        throw new Error('No healthy database available for failover');
      }

      // Switch to new database
      this.currentDatabase = nextDatabase;

      console.log(`Failover complete: ${originalDatabase} → ${nextDatabase}`);

      // Send alert
      await AlertManager['createAlert'](
        'database',
        'critical',
        `Database failover: ${originalDatabase} → ${nextDatabase}`,
        {
          from: originalDatabase,
          to: nextDatabase,
          timestamp: new Date()
        }
      ).catch(console.error);

      // Track metric
      await Metrics.recordError('database', 'FAILOVER');

      // Start recovery monitoring for original database
      if (this.autoFailback && originalDatabase === DatabaseRole.PRIMARY) {
        this.startRecoveryMonitoring();
      }

    } catch (error) {
      console.error('Failover failed:', error);
      await ErrorTracker.trackDatabaseError('failover', error);
      throw error;

    } finally {
      this.failoverInProgress = false;
    }
  }

  /**
   * Find next healthy database
   */
  private async findHealthyDatabase(): Promise<DatabaseRole | null> {
    const preferenceOrder = [
      DatabaseRole.PRIMARY,
      DatabaseRole.SECONDARY,
      DatabaseRole.TERTIARY
    ];

    for (const role of preferenceOrder) {
      if (role === this.currentDatabase) {
        continue; // Skip current failing database
      }

      const db = this.databases.get(role);
      if (!db) {
        continue;
      }

      const isHealthy = await this.checkDatabaseHealth(role);
      if (isHealthy) {
        return role;
      }
    }

    return null;
  }

  /**
   * Check health of a specific database
   */
  private async checkDatabaseHealth(role: DatabaseRole): Promise<boolean> {
    const db = this.databases.get(role);
    const health = this.healthStatus.get(role);

    if (!db || !health) {
      return false;
    }

    try {
      const start = Date.now();
      const dbHealth = await db.checkHealth();
      const responseTime = Date.now() - start;

      health.responseTime = responseTime;
      health.lastCheck = new Date();

      if (dbHealth.connected && responseTime < 5000) {
        health.healthy = true;
        health.failureCount = 0;
        return true;
      } else {
        health.healthy = false;
        return false;
      }

    } catch (error) {
      console.error(`Health check failed for ${role}:`, error);
      health.healthy = false;
      health.failureCount++;
      return false;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Initial health check
    this.checkAllDatabases().catch(console.error);

    // Periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.checkAllDatabases().catch(console.error);
    }, this.healthCheckInterval);
  }

  /**
   * Check health of all databases
   */
  private async checkAllDatabases(): Promise<void> {
    const checks = Array.from(this.databases.keys()).map(role =>
      this.checkDatabaseHealth(role)
    );

    await Promise.allSettled(checks);

    // Log status
    const statuses = Array.from(this.healthStatus.values())
      .map(h => `${h.role}: ${h.healthy ? '✅' : '❌'}`)
      .join(', ');

    console.log(`Database health: ${statuses} | Current: ${this.currentDatabase}`);
  }

  /**
   * Start monitoring for primary recovery
   */
  private startRecoveryMonitoring(): void {
    if (this.recoveryCheckTimer) {
      return; // Already monitoring
    }

    console.log('Starting primary database recovery monitoring...');

    this.recoveryCheckTimer = setInterval(async () => {
      if (this.currentDatabase === DatabaseRole.PRIMARY) {
        // Already using primary, stop monitoring
        this.stopRecoveryMonitoring();
        return;
      }

      const isPrimaryHealthy = await this.checkDatabaseHealth(DatabaseRole.PRIMARY);

      if (isPrimaryHealthy) {
        console.log('Primary database recovered, initiating failback...');

        // Perform failback to primary
        this.currentDatabase = DatabaseRole.PRIMARY;

        // Reset health status
        const primaryHealth = this.healthStatus.get(DatabaseRole.PRIMARY);
        if (primaryHealth) {
          primaryHealth.healthy = true;
          primaryHealth.failureCount = 0;
        }

        console.log('Failback to primary complete');

        // Stop recovery monitoring
        this.stopRecoveryMonitoring();

        // Send notification
        await AlertManager['createAlert'](
          'database',
          'warning',
          'Database failback to primary complete',
          { timestamp: new Date() }
        ).catch(console.error);
      }
    }, this.recoveryCheckInterval);
  }

  /**
   * Stop recovery monitoring
   */
  private stopRecoveryMonitoring(): void {
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
      this.recoveryCheckTimer = undefined;
      console.log('Stopped recovery monitoring');
    }
  }

  /**
   * Wait for failover to complete
   */
  private async waitForFailover(): Promise<void> {
    const maxWait = 10000; // 10 seconds max
    const startTime = Date.now();

    while (this.failoverInProgress && Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.failoverInProgress) {
      throw new Error('Failover timeout');
    }
  }

  /**
   * Get failover statistics
   */
  getStats() {
    const stats = {
      currentDatabase: this.currentDatabase,
      databases: Array.from(this.healthStatus.values()),
      failoverInProgress: this.failoverInProgress,
      configuration: {
        healthCheckInterval: this.healthCheckInterval,
        failoverThreshold: this.failoverThreshold,
        autoFailback: this.autoFailback
      }
    };

    return stats;
  }

  /**
   * Manual failover
   */
  async manualFailover(targetRole?: DatabaseRole): Promise<void> {
    console.log(`Manual failover requested${targetRole ? ` to ${targetRole}` : ''}`);

    if (targetRole) {
      const isHealthy = await this.checkDatabaseHealth(targetRole);
      if (!isHealthy) {
        throw new Error(`Target database ${targetRole} is not healthy`);
      }

      this.currentDatabase = targetRole;
      console.log(`Manual failover to ${targetRole} complete`);
    } else {
      await this.performFailover();
    }
  }

  /**
   * Shutdown all connections
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down database failover manager...');

    // Stop monitoring
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.recoveryCheckTimer) {
      clearInterval(this.recoveryCheckTimer);
    }

    // Shutdown all database connections
    await Promise.all(
      Array.from(this.databases.values()).map(db => db.shutdown())
    );

    console.log('Database failover manager shutdown complete');
  }
}

// Export factory function (not singleton, as configuration is required)
export function createFailoverManager(config: FailoverConfig): DatabaseFailover {
  return new DatabaseFailover(config);
}