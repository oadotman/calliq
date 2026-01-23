/**
 * Batch Loader Implementation
 * Solves N+1 query problems by batching and caching database lookups
 * Based on DataLoader pattern
 */

import { createClient } from '@/lib/supabase/client';

type BatchLoadFn<K, V> = (keys: readonly K[]) => Promise<(V | Error)[]>;

interface BatchLoaderOptions<K, V> {
  maxBatchSize?: number;
  cache?: boolean;
  cacheKeyFn?: (key: K) => string;
}

export class BatchLoader<K, V> {
  private batchFn: BatchLoadFn<K, V>;
  private options: Required<BatchLoaderOptions<K, V>>;
  private cache: Map<string, Promise<V>>;
  private batch: Array<{ key: K; resolve: (value: V) => void; reject: (error: Error) => void }>;
  private batchScheduled: boolean;

  constructor(batchFn: BatchLoadFn<K, V>, options: BatchLoaderOptions<K, V> = {}) {
    this.batchFn = batchFn;
    this.options = {
      maxBatchSize: options.maxBatchSize || 1000,
      cache: options.cache !== false,
      cacheKeyFn: options.cacheKeyFn || ((key: K) => String(key)),
    };
    this.cache = new Map();
    this.batch = [];
    this.batchScheduled = false;
  }

  /**
   * Load a single value, batching with other concurrent loads
   */
  async load(key: K): Promise<V> {
    const cacheKey = this.options.cacheKeyFn(key);

    // Return cached value if available
    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Create promise for this key
    const promise = new Promise<V>((resolve, reject) => {
      this.batch.push({ key, resolve, reject });

      // Schedule batch execution
      if (!this.batchScheduled) {
        this.batchScheduled = true;
        process.nextTick(() => this.executeBatch());
      }
    });

    // Cache the promise
    if (this.options.cache) {
      this.cache.set(cacheKey, promise);
    }

    return promise;
  }

  /**
   * Load multiple values
   */
  async loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map(key => this.load(key)));
  }

  /**
   * Clear a specific key from cache
   */
  clear(key: K): this {
    const cacheKey = this.options.cacheKeyFn(key);
    this.cache.delete(cacheKey);
    return this;
  }

  /**
   * Clear entire cache
   */
  clearAll(): this {
    this.cache.clear();
    return this;
  }

  /**
   * Prime the cache with a specific value
   */
  prime(key: K, value: V): this {
    const cacheKey = this.options.cacheKeyFn(key);
    this.cache.set(cacheKey, Promise.resolve(value));
    return this;
  }

  /**
   * Execute the batched load
   */
  private async executeBatch(): Promise<void> {
    const batch = this.batch;
    this.batch = [];
    this.batchScheduled = false;

    if (batch.length === 0) return;

    // Split into chunks if needed
    const chunks: typeof batch[] = [];
    for (let i = 0; i < batch.length; i += this.options.maxBatchSize) {
      chunks.push(batch.slice(i, i + this.options.maxBatchSize));
    }

    // Execute each chunk
    for (const chunk of chunks) {
      const keys = chunk.map(item => item.key);

      try {
        const values = await this.batchFn(keys);

        // Resolve each promise
        chunk.forEach((item, index) => {
          const value = values[index];
          if (value instanceof Error) {
            item.reject(value);
          } else {
            item.resolve(value);
          }
        });
      } catch (error) {
        // Reject all promises in chunk
        chunk.forEach(item => item.reject(error as Error));
      }
    }
  }
}

// =====================================================
// PRE-CONFIGURED BATCH LOADERS
// =====================================================

/**
 * Batch loader for user organizations
 */
export const userOrganizationLoader = new BatchLoader<string, any[]>(
  async (userIds: readonly string[]) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_organizations')
      .select('*')
      .in('user_id', userIds as string[]);

    if (error) {
      return userIds.map(() => error as Error);
    }

    // Group by user_id
    const userOrgMap = new Map<string, any[]>();
    for (const org of data || []) {
      if (!userOrgMap.has(org.user_id)) {
        userOrgMap.set(org.user_id, []);
      }
      userOrgMap.get(org.user_id)!.push(org);
    }

    // Return in same order as input
    return userIds.map(userId => userOrgMap.get(userId) || []);
  }
);

/**
 * Batch loader for call transcripts
 */
export const transcriptLoader = new BatchLoader<string, any>(
  async (callIds: readonly string[]) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .in('call_id', callIds as string[]);

    if (error) {
      return callIds.map(() => error as Error);
    }

    // Create map of call_id to transcript
    const transcriptMap = new Map<string, any>();
    for (const transcript of data || []) {
      transcriptMap.set(transcript.call_id, transcript);
    }

    // Return in same order as input
    return callIds.map(callId => transcriptMap.get(callId) || null);
  }
);

/**
 * Batch loader for call insights
 */
export const insightsLoader = new BatchLoader<string, any[]>(
  async (callIds: readonly string[]) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('call_insights')
      .select('*')
      .in('call_id', callIds as string[]);

    if (error) {
      return callIds.map(() => error as Error);
    }

    // Group insights by call_id
    const insightsMap = new Map<string, any[]>();
    for (const insight of data || []) {
      if (!insightsMap.has(insight.call_id)) {
        insightsMap.set(insight.call_id, []);
      }
      insightsMap.get(insight.call_id)!.push(insight);
    }

    // Return in same order as input
    return callIds.map(callId => insightsMap.get(callId) || []);
  }
);

/**
 * Batch loader for referral tiers
 */
export const referralTierLoader = new BatchLoader<string, string | null>(
  async (userIds: readonly string[]) => {
    const supabase = createClient();

    // Batch load referral counts
    const { data, error } = await supabase
      .from('referrals')
      .select('referrer_id')
      .in('referrer_id', userIds as string[])
      .eq('status', 'activated');

    if (error) {
      return userIds.map(() => error as Error);
    }

    // Count referrals per user
    const referralCounts = new Map<string, number>();
    for (const referral of data || []) {
      referralCounts.set(
        referral.referrer_id,
        (referralCounts.get(referral.referrer_id) || 0) + 1
      );
    }

    // Calculate tier for each user
    return userIds.map(userId => {
      const count = referralCounts.get(userId) || 0;
      if (count >= 10) return 'gold';
      if (count >= 5) return 'silver';
      if (count >= 1) return 'bronze';
      return null;
    });
  }
);

/**
 * Create a custom batch loader
 */
export function createBatchLoader<K, V>(
  tableName: string,
  keyColumn: string,
  columns: string = '*'
): BatchLoader<K, V> {
  return new BatchLoader(async (keys: readonly K[]) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(tableName)
      .select(columns)
      .in(keyColumn, keys as any[]);

    if (error) {
      return keys.map(() => error);
    }

    // Create map of key to value
    const resultMap = new Map<K, V>();
    for (const item of data || []) {
      resultMap.set((item as any)[keyColumn] as K, item as V);
    }

    // Return in same order as input
    return keys.map(key => resultMap.get(key) || null) as (V | Error)[];
  });
}

// Example usage:
// Instead of:
//   for (const call of calls) {
//     const transcript = await getTranscript(call.id);
//     const insights = await getInsights(call.id);
//   }
//
// Use:
//   const transcripts = await transcriptLoader.loadMany(calls.map(c => c.id));
//   const insights = await insightsLoader.loadMany(calls.map(c => c.id));