/**
 * Query Optimization Utilities
 * Provides helpers for writing efficient database queries
 * Includes query builders, batch operations, and performance tips
 */

import { QueryResult, QueryResultRow } from 'pg';
import { db } from './connection-manager';
import { dbRouter } from './read-replica';
import { cacheManager } from '@/lib/redis/cache-manager';

export interface QueryPlan {
  query: string;
  params: any[];
  useCache?: boolean;
  cacheTTL?: number;
  preferReplica?: boolean;
}

export interface BatchInsertOptions {
  tableName: string;
  columns: string[];
  values: any[][];
  onConflict?: string;
  returning?: string;
  chunkSize?: number;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  direction?: 'ASC' | 'DESC';
}

export class QueryOptimizer {
  /**
   * Build optimized SELECT query with pagination
   */
  static buildSelectQuery(
    table: string,
    options: {
      columns?: string[];
      where?: Record<string, any>;
      joins?: Array<{ type: 'INNER' | 'LEFT' | 'RIGHT'; table: string; on: string }>;
      pagination?: PaginationOptions;
      groupBy?: string[];
      having?: string;
    }
  ): QueryPlan {
    const {
      columns = ['*'],
      where = {},
      joins = [],
      pagination,
      groupBy,
      having
    } = options;

    let query = `SELECT ${columns.join(', ')} FROM ${table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Add joins
    for (const join of joins) {
      query += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // Add WHERE clause
    const whereConditions = Object.entries(where)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        if (value === null) {
          return `${key} IS NULL`;
        } else if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          params.push(...value);
          return `${key} IN (${placeholders})`;
        } else if (typeof value === 'object' && value.operator) {
          // Support for operators like {operator: '>', value: 100}
          params.push(value.value);
          return `${key} ${value.operator} $${paramIndex++}`;
        } else {
          params.push(value);
          return `${key} = $${paramIndex++}`;
        }
      });

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Add GROUP BY
    if (groupBy && groupBy.length > 0) {
      query += ' GROUP BY ' + groupBy.join(', ');
    }

    // Add HAVING
    if (having) {
      query += ' HAVING ' + having;
    }

    // Add ORDER BY and pagination
    if (pagination) {
      const { page, limit, orderBy = 'id', direction = 'ASC' } = pagination;
      const offset = (page - 1) * limit;

      query += ` ORDER BY ${orderBy} ${direction}`;
      query += ` LIMIT ${limit} OFFSET ${offset}`;
    }

    return { query, params };
  }

  /**
   * Perform efficient batch insert
   */
  static async batchInsert<T extends QueryResultRow = any>(
    options: BatchInsertOptions
  ): Promise<QueryResult<T>> {
    const {
      tableName,
      columns,
      values,
      onConflict,
      returning,
      chunkSize = 1000
    } = options;

    if (values.length === 0) {
      return { rows: [], rowCount: 0 } as QueryResult<T>;
    }

    // Split into chunks for very large inserts
    if (values.length > chunkSize) {
      const chunks = [];
      for (let i = 0; i < values.length; i += chunkSize) {
        chunks.push(values.slice(i, i + chunkSize));
      }

      const results = await Promise.all(
        chunks.map(chunk =>
          this.batchInsert<T>({
            ...options,
            values: chunk
          })
        )
      );

      // Combine results
      const combinedRows = results.flatMap(r => r.rows);
      const totalCount = results.reduce((sum, r) => sum + (r.rowCount || 0), 0);

      return {
        rows: combinedRows,
        rowCount: totalCount
      } as QueryResult<T>;
    }

    // Build the query
    let query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES `;

    const valueStrings: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const row of values) {
      const placeholders = row.map(() => `$${paramIndex++}`).join(', ');
      valueStrings.push(`(${placeholders})`);
      params.push(...row);
    }

    query += valueStrings.join(', ');

    if (onConflict) {
      query += ` ON CONFLICT ${onConflict}`;
    }

    if (returning) {
      query += ` RETURNING ${returning}`;
    }

    return db.query<T>(query, params);
  }

  /**
   * Perform upsert operation
   */
  static async upsert<T extends QueryResultRow = any>(
    table: string,
    data: Record<string, any>,
    conflictColumns: string[],
    updateColumns?: string[]
  ): Promise<QueryResult<T>> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const updateCols = updateColumns || columns.filter(c => !conflictColumns.includes(c));

    let query = `INSERT INTO ${table} (${columns.join(', ')})`;
    query += ` VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})`;
    query += ` ON CONFLICT (${conflictColumns.join(', ')})`;

    if (updateCols.length > 0) {
      query += ' DO UPDATE SET ';
      query += updateCols.map(col => `${col} = EXCLUDED.${col}`).join(', ');
    } else {
      query += ' DO NOTHING';
    }

    query += ' RETURNING *';

    return db.query<T>(query, values);
  }

  /**
   * Execute query with caching
   */
  static async cachedQuery<T extends QueryResultRow = any>(
    query: string,
    params: any[],
    cacheKey: string,
    ttl: number = 300
  ): Promise<QueryResult<T>> {
    // Try to get from cache
    const cached = await cacheManager.get<QueryResult<T>>(cacheKey);
    if (cached) {
      console.log(`Cache hit for query: ${cacheKey}`);
      return cached;
    }

    // Execute query
    const result = await dbRouter.read<T>(query, params);

    // Cache the result
    await cacheManager.set(cacheKey, result, ttl);

    return result;
  }

  /**
   * Count rows efficiently
   */
  static async count(
    table: string,
    where?: Record<string, any>
  ): Promise<number> {
    const { query, params } = this.buildSelectQuery(table, {
      columns: ['COUNT(*) as count'],
      where
    });

    const result = await dbRouter.read(query, params);
    return parseInt(result.rows[0]?.count || '0');
  }

  /**
   * Check if record exists
   */
  static async exists(
    table: string,
    where: Record<string, any>
  ): Promise<boolean> {
    const { query, params } = this.buildSelectQuery(table, {
      columns: ['1'],
      where,
      pagination: { page: 1, limit: 1 }
    });

    const result = await dbRouter.read(query, params);
    return result.rowCount > 0;
  }

  /**
   * Delete with returning
   */
  static async deleteReturning<T extends QueryResultRow = any>(
    table: string,
    where: Record<string, any>,
    returning: string[] = ['*']
  ): Promise<QueryResult<T>> {
    const whereConditions = Object.entries(where)
      .map(([key, value], index) => {
        if (value === null) {
          return `${key} IS NULL`;
        }
        return `${key} = $${index + 1}`;
      });

    const query = `DELETE FROM ${table} WHERE ${whereConditions.join(' AND ')} RETURNING ${returning.join(', ')}`;
    const params = Object.values(where).filter(v => v !== null);

    return db.query<T>(query, params);
  }

  /**
   * Bulk update with different values
   */
  static async bulkUpdate<T extends QueryResultRow = any>(
    table: string,
    updates: Array<{ id: string | number; data: Record<string, any> }>
  ): Promise<QueryResult<T>> {
    if (updates.length === 0) {
      return { rows: [], rowCount: 0 } as QueryResult<T>;
    }

    // Build a single UPDATE query using CASE statements
    const columns = new Set<string>();
    updates.forEach(u => Object.keys(u.data).forEach(k => columns.add(k)));

    let query = `UPDATE ${table} SET `;
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build CASE statements for each column
    for (const column of columns) {
      let caseClause = `${column} = CASE id `;

      for (const update of updates) {
        if (update.data[column] !== undefined) {
          caseClause += `WHEN $${paramIndex++} THEN $${paramIndex++} `;
          params.push(update.id, update.data[column]);
        }
      }

      caseClause += `ELSE ${column} END`;
      setClauses.push(caseClause);
    }

    query += setClauses.join(', ');

    // Add WHERE clause for the IDs
    const idPlaceholders = updates.map(() => `$${paramIndex++}`).join(', ');
    params.push(...updates.map(u => u.id));
    query += ` WHERE id IN (${idPlaceholders})`;
    query += ' RETURNING *';

    return db.query<T>(query, params);
  }

  /**
   * Get query execution plan (for debugging)
   */
  static async explainQuery(
    query: string,
    params: any[],
    analyze: boolean = false
  ): Promise<any> {
    const explainQuery = `EXPLAIN ${analyze ? 'ANALYZE' : ''} ${query}`;
    const result = await db.query(explainQuery, params);
    return result.rows;
  }

  /**
   * Optimize table (VACUUM and ANALYZE)
   */
  static async optimizeTable(tableName: string): Promise<void> {
    try {
      // Note: VACUUM cannot run inside a transaction
      await db.query(`VACUUM ANALYZE ${tableName}`);
      console.log(`Table ${tableName} optimized`);
    } catch (error) {
      console.error(`Failed to optimize table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get table statistics
   */
  static async getTableStats(tableName: string): Promise<any> {
    const query = `
      SELECT
        schemaname,
        tablename,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        n_mod_since_analyze as modifications_since_analyze,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE tablename = $1
    `;

    const result = await db.query(query, [tableName]);
    return result.rows[0];
  }

  /**
   * Get index usage statistics
   */
  static async getIndexStats(tableName: string): Promise<any[]> {
    const query = `
      SELECT
        indexrelname as index_name,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE tablename = $1
      ORDER BY idx_scan DESC
    `;

    const result = await db.query(query, [tableName]);
    return result.rows;
  }

  /**
   * Suggest missing indexes based on query patterns
   */
  static async suggestIndexes(tableName: string): Promise<string[]> {
    // This is a simplified version - real implementation would analyze pg_stat_statements
    const suggestions: string[] = [];

    // Check for foreign key columns without indexes
    const fkQuery = `
      SELECT
        tc.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND NOT EXISTS (
          SELECT 1
          FROM pg_indexes
          WHERE tablename = $1
            AND indexdef LIKE '%' || kcu.column_name || '%'
        )
    `;

    const result = await db.query(fkQuery, [tableName]);

    for (const row of result.rows) {
      suggestions.push(
        `CREATE INDEX idx_${tableName}_${row.column_name} ON ${tableName}(${row.column_name});`
      );
    }

    return suggestions;
  }
}

/**
 * Query builder helper for complex queries
 */
export class QueryBuilder {
  private table: string;
  private selectColumns: string[] = ['*'];
  private whereConditions: Array<{ column: string; operator: string; value: any }> = [];
  private joinClauses: Array<{ type: string; table: string; on: string }> = [];
  private orderByClause?: { column: string; direction: 'ASC' | 'DESC' };
  private limitValue?: number;
  private offsetValue?: number;
  private groupByColumns: string[] = [];
  private havingClause?: string;

  constructor(table: string) {
    this.table = table;
  }

  select(...columns: string[]): this {
    this.selectColumns = columns;
    return this;
  }

  where(column: string, operator: string, value: any): this {
    this.whereConditions.push({ column, operator, value });
    return this;
  }

  join(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, on: string): this {
    this.joinClauses.push({ type, table, on });
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderByClause = { column, direction };
    return this;
  }

  limit(value: number): this {
    this.limitValue = value;
    return this;
  }

  offset(value: number): this {
    this.offsetValue = value;
    return this;
  }

  groupBy(...columns: string[]): this {
    this.groupByColumns = columns;
    return this;
  }

  having(clause: string): this {
    this.havingClause = clause;
    return this;
  }

  build(): QueryPlan {
    let query = `SELECT ${this.selectColumns.join(', ')} FROM ${this.table}`;
    const params: any[] = [];
    let paramIndex = 1;

    // Add joins
    for (const join of this.joinClauses) {
      query += ` ${join.type} JOIN ${join.table} ON ${join.on}`;
    }

    // Add WHERE
    if (this.whereConditions.length > 0) {
      const conditions = this.whereConditions.map(cond => {
        if (cond.value === null && cond.operator === '=') {
          return `${cond.column} IS NULL`;
        } else if (cond.value === null && cond.operator === '!=') {
          return `${cond.column} IS NOT NULL`;
        } else {
          params.push(cond.value);
          return `${cond.column} ${cond.operator} $${paramIndex++}`;
        }
      });
      query += ' WHERE ' + conditions.join(' AND ');
    }

    // Add GROUP BY
    if (this.groupByColumns.length > 0) {
      query += ' GROUP BY ' + this.groupByColumns.join(', ');
    }

    // Add HAVING
    if (this.havingClause) {
      query += ' HAVING ' + this.havingClause;
    }

    // Add ORDER BY
    if (this.orderByClause) {
      query += ` ORDER BY ${this.orderByClause.column} ${this.orderByClause.direction}`;
    }

    // Add LIMIT and OFFSET
    if (this.limitValue) {
      query += ` LIMIT ${this.limitValue}`;
    }
    if (this.offsetValue) {
      query += ` OFFSET ${this.offsetValue}`;
    }

    return { query, params };
  }

  async execute<T extends QueryResultRow = any>(): Promise<QueryResult<T>> {
    const { query, params } = this.build();
    return dbRouter.read<T>(query, params);
  }
}