/**
 * Circuit Breaker Implementation
 * Prevents cascade failures by stopping requests to failing services
 */

import { logger } from '@/lib/logger';
import redisClient from '@/lib/redis/client';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Service is down, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening
  resetTimeout?: number; // Time in ms before trying again
  monitoringPeriod?: number; // Time window for counting failures
  requestTimeout?: number; // Individual request timeout
  volumeThreshold?: number; // Minimum requests before opening
  errorThresholdPercentage?: number; // Error percentage to open
  fallback?: () => Promise<any>; // Fallback function when open
}

export class CircuitBreaker<T = any> {
  private serviceName: string;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttempt: number = Date.now();
  private requestCount: number = 0;

  // Configuration
  private failureThreshold: number;
  private resetTimeout: number;
  private monitoringPeriod: number;
  private requestTimeout: number;
  private volumeThreshold: number;
  private errorThresholdPercentage: number;
  private fallback?: () => Promise<T>;

  constructor(serviceName: string, options: CircuitBreakerOptions = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 60 seconds
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.requestTimeout = options.requestTimeout || 5000; // 5 seconds
    this.volumeThreshold = options.volumeThreshold || 10;
    this.errorThresholdPercentage = options.errorThresholdPercentage || 50;
    this.fallback = options.fallback;

    // Load state from Redis if available
    this.loadState();
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        return this.handleOpen();
      }
      // Try half-open state
      this.state = CircuitState.HALF_OPEN;
      logger.info(`Circuit breaker half-open for ${this.serviceName}`);
    }

    try {
      // Add timeout to the request
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), this.requestTimeout)
      )
    ]);
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.failures = 0;
    this.successes++;
    this.requestCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      logger.info(`Circuit breaker closed for ${this.serviceName}`);
    }

    // Update Redis state
    this.saveState();

    // Record metrics
    this.recordMetric('success');
  }

  /**
   * Handle failed request
   */
  private onFailure(error: any): void {
    this.failures++;
    this.requestCount++;
    this.lastFailureTime = Date.now();

    // Log the error
    logger.error({
      error: error.message,
      failures: this.failures,
      state: this.state
    }, `Circuit breaker failure for ${this.serviceName}`);

    // Record metrics
    this.recordMetric('failure');

    // Check if we should open the circuit
    if (this.shouldOpen()) {
      this.open();
    }

    // Update Redis state
    this.saveState();
  }

  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    // Not enough requests to make a decision
    if (this.requestCount < this.volumeThreshold) {
      return false;
    }

    // Check failure threshold
    if (this.failures >= this.failureThreshold) {
      return true;
    }

    // Check error percentage
    const errorPercentage = (this.failures / this.requestCount) * 100;
    return errorPercentage >= this.errorThresholdPercentage;
  }

  /**
   * Open the circuit
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.resetTimeout;

    logger.warn({
      failures: this.failures,
      nextAttempt: new Date(this.nextAttempt).toISOString()
    }, `Circuit breaker opened for ${this.serviceName}`);

    // Send alert
    this.sendAlert('opened');
  }

  /**
   * Handle open circuit
   */
  private async handleOpen(): Promise<T> {
    // Record rejection
    this.recordMetric('rejection');

    // Use fallback if available
    if (this.fallback) {
      logger.info(`Using fallback for ${this.serviceName}`);
      return this.fallback();
    }

    // Throw circuit open error
    throw new Error(`Circuit breaker is open for ${this.serviceName}`);
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.requestCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();

    logger.info(`Circuit breaker reset for ${this.serviceName}`);
    this.saveState();
  }

  /**
   * Get current state
   */
  getState(): {
    service: string;
    state: CircuitState;
    failures: number;
    successes: number;
    requestCount: number;
    lastFailureTime: number | null;
    nextAttempt: number;
  } {
    return {
      service: this.serviceName,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }

  /**
   * Load state from Redis
   */
  private async loadState(): Promise<void> {
    try {
      const key = `circuit:${this.serviceName}`;
      const data = await redisClient.get(key);

      if (data) {
        const state = JSON.parse(data);
        this.state = state.state;
        this.failures = state.failures;
        this.successes = state.successes;
        this.lastFailureTime = state.lastFailureTime;
        this.nextAttempt = state.nextAttempt;
        this.requestCount = state.requestCount;
      }
    } catch (error) {
      logger.error({ error }, `Failed to load circuit breaker state for ${this.serviceName}`);
    }
  }

  /**
   * Save state to Redis
   */
  private async saveState(): Promise<void> {
    try {
      const key = `circuit:${this.serviceName}`;
      const data = JSON.stringify(this.getState());
      await redisClient.setex(key, 300, data); // 5 minute TTL
    } catch (error) {
      logger.error({ error }, `Failed to save circuit breaker state for ${this.serviceName}`);
    }
  }

  /**
   * Record metrics
   */
  private async recordMetric(type: 'success' | 'failure' | 'rejection'): Promise<void> {
    try {
      const key = `metrics:circuit:${this.serviceName}:${type}`;
      await redisClient.incr(key);
    } catch (error) {
      // Ignore metric errors
    }
  }

  /**
   * Send alert when circuit opens
   */
  private async sendAlert(event: string): Promise<void> {
    try {
      // This would integrate with your alerting system
      const alertKey = `alerts:circuit:${this.serviceName}`;
      await redisClient.setex(alertKey, 3600, JSON.stringify({
        service: this.serviceName,
        event,
        timestamp: new Date().toISOString(),
        state: this.getState()
      }));
    } catch (error) {
      // Ignore alert errors
    }
  }
}

/**
 * Circuit breaker factory with retry logic
 */
export class CircuitBreakerFactory {
  private static breakers: Map<string, CircuitBreaker> = new Map();

  /**
   * Get or create a circuit breaker
   */
  static getBreaker(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, options));
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Execute with retry and exponential backoff
   */
  static async executeWithRetry<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      factor?: number;
      circuitBreakerOptions?: CircuitBreakerOptions;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || 3;
    const initialDelay = options.initialDelay || 100;
    const maxDelay = options.maxDelay || 10000;
    const factor = options.factor || 2;

    const breaker = this.getBreaker(serviceName, options.circuitBreakerOptions);

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await breaker.execute(fn);
      } catch (error: any) {
        lastError = error;

        // Don't retry if circuit is open
        if (error.message?.includes('Circuit breaker is open')) {
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retrying
        logger.info(`Retrying ${serviceName} after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));

        // Exponential backoff
        delay = Math.min(delay * factor, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Get all circuit breaker states
   */
  static getAllStates(): Array<ReturnType<CircuitBreaker['getState']>> {
    return Array.from(this.breakers.values()).map(breaker => breaker.getState());
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }
}

/**
 * Predefined circuit breakers for external services
 */
export const circuitBreakers = {
  assemblyAI: () => CircuitBreakerFactory.getBreaker('AssemblyAI', {
    failureThreshold: 5,
    resetTimeout: 60000,
    requestTimeout: 30000,
    fallback: async () => ({
      error: 'Transcription service temporarily unavailable',
      fallback: true
    })
  }),

  openAI: () => CircuitBreakerFactory.getBreaker('OpenAI', {
    failureThreshold: 5,
    resetTimeout: 60000,
    requestTimeout: 30000,
    fallback: async () => ({
      error: 'AI extraction service temporarily unavailable',
      fallback: true
    })
  }),

  paddle: () => CircuitBreakerFactory.getBreaker('Paddle', {
    failureThreshold: 3,
    resetTimeout: 120000,
    requestTimeout: 10000,
    errorThresholdPercentage: 30
  }),

  resend: () => CircuitBreakerFactory.getBreaker('Resend', {
    failureThreshold: 10,
    resetTimeout: 30000,
    requestTimeout: 5000,
    fallback: async () => ({
      queued: true,
      message: 'Email queued for later delivery'
    })
  }),

  supabase: () => CircuitBreakerFactory.getBreaker('Supabase', {
    failureThreshold: 10,
    resetTimeout: 30000,
    requestTimeout: 5000,
    errorThresholdPercentage: 20
  })
};