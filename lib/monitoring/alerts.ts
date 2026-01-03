/**
 * Simple Alert System
 * Monitors critical metrics and sends alerts when thresholds are exceeded
 * Focused on preventing system failures rather than complex analytics
 */

import redisClient from '@/lib/redis/client';
import { Metrics } from './metrics';
import { createClient } from '@/lib/supabase/server';

export interface Alert {
  id: string;
  type: 'error_rate' | 'response_time' | 'queue_depth' | 'memory' | 'database' | 'redis';
  severity: 'warning' | 'critical' | 'emergency';
  message: string;
  details: any;
  timestamp: Date;
  resolved: boolean;
}

export interface AlertThresholds {
  errorRate: {
    warning: number;    // Errors per minute
    critical: number;
    emergency: number;
  };
  responseTime: {
    warning: number;    // Milliseconds
    critical: number;
    emergency: number;
  };
  queueDepth: {
    warning: number;    // Number of jobs
    critical: number;
    emergency: number;
  };
  memory: {
    warning: number;    // Percentage
    critical: number;
    emergency: number;
  };
  cacheHitRate: {
    warning: number;    // Percentage (below this is bad)
    critical: number;
    emergency: number;
  };
}

export class AlertManager {
  private static readonly ALERT_PREFIX = 'alerts:';
  private static readonly CHECK_INTERVAL = 60000; // Check every minute
  private static readonly ALERT_COOLDOWN = 300000; // 5 minutes between same alerts

  // Default thresholds (can be overridden via environment variables)
  private static readonly DEFAULT_THRESHOLDS: AlertThresholds = {
    errorRate: {
      warning: 10,      // 10 errors/min
      critical: 50,     // 50 errors/min
      emergency: 100    // 100 errors/min
    },
    responseTime: {
      warning: 1000,    // 1 second
      critical: 3000,   // 3 seconds
      emergency: 5000   // 5 seconds
    },
    queueDepth: {
      warning: 100,     // 100 jobs
      critical: 500,    // 500 jobs
      emergency: 1000   // 1000 jobs
    },
    memory: {
      warning: 70,      // 70% memory
      critical: 85,     // 85% memory
      emergency: 95     // 95% memory
    },
    cacheHitRate: {
      warning: 70,      // Below 70% is warning
      critical: 50,     // Below 50% is critical
      emergency: 30     // Below 30% is emergency
    }
  };

  /**
   * Start monitoring and alerting
   */
  static startMonitoring(): NodeJS.Timeout {
    // Initial check
    this.checkAndAlert().catch(console.error);

    // Schedule regular checks
    return setInterval(() => {
      this.checkAndAlert().catch(console.error);
    }, this.CHECK_INTERVAL);
  }

  /**
   * Main check and alert method
   */
  static async checkAndAlert(): Promise<void> {
    try {
      const checks = await Promise.allSettled([
        this.checkErrorRate(),
        this.checkResponseTime(),
        this.checkQueueDepth(),
        this.checkMemoryUsage(),
        this.checkCacheHitRate(),
        this.checkDatabaseHealth(),
        this.checkRedisHealth()
      ]);

      // Process results
      for (const check of checks) {
        if (check.status === 'rejected') {
          console.error('Alert check failed:', check.reason);
        }
      }
    } catch (error) {
      console.error('Alert system error:', error);
    }
  }

  /**
   * Check error rate
   */
  private static async checkErrorRate(): Promise<void> {
    const errorCount = await redisClient.get('metrics:errors:total');
    const errors = parseInt(errorCount || '0');

    const thresholds = this.getThresholds().errorRate;

    if (errors > thresholds.emergency) {
      await this.createAlert('error_rate', 'emergency', `Error rate critical: ${errors} errors/min`, { errors });
    } else if (errors > thresholds.critical) {
      await this.createAlert('error_rate', 'critical', `High error rate: ${errors} errors/min`, { errors });
    } else if (errors > thresholds.warning) {
      await this.createAlert('error_rate', 'warning', `Elevated error rate: ${errors} errors/min`, { errors });
    } else {
      await this.resolveAlert('error_rate');
    }
  }

  /**
   * Check response time
   */
  private static async checkResponseTime(): Promise<void> {
    const avgResponseTime = await Metrics.getAverageResponseTime();
    const thresholds = this.getThresholds().responseTime;

    if (avgResponseTime > thresholds.emergency) {
      await this.createAlert('response_time', 'emergency', `Response time critical: ${avgResponseTime}ms`, { avgResponseTime });
    } else if (avgResponseTime > thresholds.critical) {
      await this.createAlert('response_time', 'critical', `Response time high: ${avgResponseTime}ms`, { avgResponseTime });
    } else if (avgResponseTime > thresholds.warning) {
      await this.createAlert('response_time', 'warning', `Response time elevated: ${avgResponseTime}ms`, { avgResponseTime });
    } else {
      await this.resolveAlert('response_time');
    }
  }

  /**
   * Check queue depth
   */
  private static async checkQueueDepth(): Promise<void> {
    const queues = ['transcription', 'extraction', 'email'];
    const thresholds = this.getThresholds().queueDepth;

    for (const queue of queues) {
      const depth = await redisClient.get(`metrics:queue:${queue}`);
      const queueSize = parseInt(depth || '0');

      if (queueSize > thresholds.emergency) {
        await this.createAlert('queue_depth', 'emergency', `Queue ${queue} overloaded: ${queueSize} jobs`, { queue, queueSize });
      } else if (queueSize > thresholds.critical) {
        await this.createAlert('queue_depth', 'critical', `Queue ${queue} backlog: ${queueSize} jobs`, { queue, queueSize });
      } else if (queueSize > thresholds.warning) {
        await this.createAlert('queue_depth', 'warning', `Queue ${queue} building: ${queueSize} jobs`, { queue, queueSize });
      }
    }
  }

  /**
   * Check memory usage
   */
  private static async checkMemoryUsage(): Promise<void> {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usedPercentage = Math.round((memUsage.rss / totalMemory) * 100);

    const thresholds = this.getThresholds().memory;

    if (usedPercentage > thresholds.emergency) {
      await this.createAlert('memory', 'emergency', `Memory usage critical: ${usedPercentage}%`, {
        used: memUsage.rss,
        total: totalMemory,
        percentage: usedPercentage
      });
    } else if (usedPercentage > thresholds.critical) {
      await this.createAlert('memory', 'critical', `Memory usage high: ${usedPercentage}%`, {
        used: memUsage.rss,
        total: totalMemory,
        percentage: usedPercentage
      });
    } else if (usedPercentage > thresholds.warning) {
      await this.createAlert('memory', 'warning', `Memory usage elevated: ${usedPercentage}%`, {
        used: memUsage.rss,
        total: totalMemory,
        percentage: usedPercentage
      });
    } else {
      await this.resolveAlert('memory');
    }
  }

  /**
   * Check cache hit rate
   */
  private static async checkCacheHitRate(): Promise<void> {
    const hits = await redisClient.get('metrics:cache:hits');
    const misses = await redisClient.get('metrics:cache:misses');

    const hitsCount = parseInt(hits || '0');
    const missesCount = parseInt(misses || '0');
    const total = hitsCount + missesCount;

    if (total > 100) { // Only check if we have enough data
      const hitRate = Math.round((hitsCount / total) * 100);
      const thresholds = this.getThresholds().cacheHitRate;

      if (hitRate < thresholds.emergency) {
        await this.createAlert('redis', 'emergency', `Cache hit rate critical: ${hitRate}%`, { hitRate, hits: hitsCount, misses: missesCount });
      } else if (hitRate < thresholds.critical) {
        await this.createAlert('redis', 'critical', `Cache hit rate low: ${hitRate}%`, { hitRate, hits: hitsCount, misses: missesCount });
      } else if (hitRate < thresholds.warning) {
        await this.createAlert('redis', 'warning', `Cache hit rate below target: ${hitRate}%`, { hitRate, hits: hitsCount, misses: missesCount });
      }
    }
  }

  /**
   * Check database health
   */
  private static async checkDatabaseHealth(): Promise<void> {
    try {
      const supabase = createClient();
      const start = Date.now();

      const { error } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      const responseTime = Date.now() - start;

      if (error && error.code !== 'PGRST116') {
        await this.createAlert('database', 'critical', 'Database connection failed', { error: error.message });
      } else if (responseTime > 5000) {
        await this.createAlert('database', 'warning', `Database response slow: ${responseTime}ms`, { responseTime });
      } else {
        await this.resolveAlert('database');
      }
    } catch (error) {
      await this.createAlert('database', 'emergency', 'Database check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check Redis health
   */
  private static async checkRedisHealth(): Promise<void> {
    try {
      const start = Date.now();
      await redisClient.ping();
      const responseTime = Date.now() - start;

      if (responseTime > 1000) {
        await this.createAlert('redis', 'warning', `Redis response slow: ${responseTime}ms`, { responseTime });
      } else {
        await this.resolveAlert('redis');
      }
    } catch (error) {
      await this.createAlert('redis', 'emergency', 'Redis connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create an alert
   */
  private static async createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    details: any
  ): Promise<void> {
    try {
      const alertId = `${type}:${Date.now()}`;
      const alertKey = `${this.ALERT_PREFIX}active:${type}`;

      // Check if we already have an active alert of this type (cooldown)
      const existingAlert = await redisClient.get(alertKey);
      if (existingAlert) {
        const existing = JSON.parse(existingAlert);
        const timeSinceAlert = Date.now() - existing.timestamp;

        if (timeSinceAlert < this.ALERT_COOLDOWN) {
          // Don't send duplicate alerts within cooldown period
          return;
        }
      }

      const alert: Alert = {
        id: alertId,
        type,
        severity,
        message,
        details,
        timestamp: new Date(),
        resolved: false
      };

      // Store alert
      await redisClient.setex(alertKey, 3600, JSON.stringify(alert)); // 1 hour TTL

      // Add to alert history
      const historyKey = `${this.ALERT_PREFIX}history`;
      await redisClient.lpush(historyKey, JSON.stringify(alert));
      await redisClient.ltrim(historyKey, 0, 999); // Keep last 1000 alerts

      // Send alert
      await this.sendAlert(alert);
    } catch (error) {
      console.error('Failed to create alert:', error);
    }
  }

  /**
   * Resolve an alert type
   */
  private static async resolveAlert(type: Alert['type']): Promise<void> {
    try {
      const alertKey = `${this.ALERT_PREFIX}active:${type}`;
      const existingAlert = await redisClient.get(alertKey);

      if (existingAlert) {
        const alert = JSON.parse(existingAlert);
        alert.resolved = true;
        alert.resolvedAt = new Date();

        // Remove active alert
        await redisClient.del(alertKey);

        // Log resolution
        console.log(`Alert resolved: ${type}`);
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }

  /**
   * Send alert (email, Slack, etc.)
   */
  private static async sendAlert(alert: Alert): Promise<void> {
    // Console logging (always)
    const emoji = alert.severity === 'emergency' ? '🚨' :
                 alert.severity === 'critical' ? '⚠️' : '⚡';

    console.error(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    console.error('Details:', alert.details);

    // Email notification (if configured)
    if (process.env.ALERT_EMAIL) {
      try {
        // TODO: Implement email sending
        // await sendEmail(process.env.ALERT_EMAIL, alert);
      } catch (error) {
        console.error('Failed to send alert email:', error);
      }
    }

    // Slack notification (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await this.sendSlackAlert(alert);
      } catch (error) {
        console.error('Failed to send Slack alert:', error);
      }
    }
  }

  /**
   * Send alert to Slack
   */
  private static async sendSlackAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    const color = alert.severity === 'emergency' ? '#FF0000' :
                  alert.severity === 'critical' ? '#FFA500' : '#FFFF00';

    const payload = {
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()} Alert: ${alert.type}`,
        text: alert.message,
        fields: Object.entries(alert.details).map(([key, value]) => ({
          title: key,
          value: String(value),
          short: true
        })),
        footer: 'CallIQ Monitoring',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    // Send to Slack webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Get alert history
   */
  static async getAlertHistory(limit: number = 100): Promise<Alert[]> {
    try {
      const historyKey = `${this.ALERT_PREFIX}history`;
      const history = await redisClient.lrange(historyKey, 0, limit - 1);

      return history.map(item => JSON.parse(item));
    } catch (error) {
      console.error('Failed to get alert history:', error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  static async getActiveAlerts(): Promise<Alert[]> {
    try {
      const pattern = `${this.ALERT_PREFIX}active:*`;
      const keys = await redisClient.keys(pattern);

      const alerts: Alert[] = [];

      for (const key of keys) {
        const alert = await redisClient.get(key);
        if (alert) {
          alerts.push(JSON.parse(alert));
        }
      }

      return alerts;
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Get thresholds (from environment or defaults)
   */
  private static getThresholds(): AlertThresholds {
    return {
      errorRate: {
        warning: parseInt(process.env.ALERT_ERROR_WARNING || '') || this.DEFAULT_THRESHOLDS.errorRate.warning,
        critical: parseInt(process.env.ALERT_ERROR_CRITICAL || '') || this.DEFAULT_THRESHOLDS.errorRate.critical,
        emergency: parseInt(process.env.ALERT_ERROR_EMERGENCY || '') || this.DEFAULT_THRESHOLDS.errorRate.emergency
      },
      responseTime: {
        warning: parseInt(process.env.ALERT_RESPONSE_WARNING || '') || this.DEFAULT_THRESHOLDS.responseTime.warning,
        critical: parseInt(process.env.ALERT_RESPONSE_CRITICAL || '') || this.DEFAULT_THRESHOLDS.responseTime.critical,
        emergency: parseInt(process.env.ALERT_RESPONSE_EMERGENCY || '') || this.DEFAULT_THRESHOLDS.responseTime.emergency
      },
      queueDepth: {
        warning: parseInt(process.env.ALERT_QUEUE_WARNING || '') || this.DEFAULT_THRESHOLDS.queueDepth.warning,
        critical: parseInt(process.env.ALERT_QUEUE_CRITICAL || '') || this.DEFAULT_THRESHOLDS.queueDepth.critical,
        emergency: parseInt(process.env.ALERT_QUEUE_EMERGENCY || '') || this.DEFAULT_THRESHOLDS.queueDepth.emergency
      },
      memory: {
        warning: parseInt(process.env.ALERT_MEMORY_WARNING || '') || this.DEFAULT_THRESHOLDS.memory.warning,
        critical: parseInt(process.env.ALERT_MEMORY_CRITICAL || '') || this.DEFAULT_THRESHOLDS.memory.critical,
        emergency: parseInt(process.env.ALERT_MEMORY_EMERGENCY || '') || this.DEFAULT_THRESHOLDS.memory.emergency
      },
      cacheHitRate: {
        warning: parseInt(process.env.ALERT_CACHE_WARNING || '') || this.DEFAULT_THRESHOLDS.cacheHitRate.warning,
        critical: parseInt(process.env.ALERT_CACHE_CRITICAL || '') || this.DEFAULT_THRESHOLDS.cacheHitRate.critical,
        emergency: parseInt(process.env.ALERT_CACHE_EMERGENCY || '') || this.DEFAULT_THRESHOLDS.cacheHitRate.emergency
      }
    };
  }
}