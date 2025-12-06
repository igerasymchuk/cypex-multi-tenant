import { Pool, PoolConfig } from 'pg';
import { Service } from 'typedi';
import { env } from './env';
import { logger } from './logger';

@Service()
export class DatabasePool {
  private pool: Pool;

  constructor() {
    const config: PoolConfig = {
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      logger.error({ err }, 'Unexpected database pool error');
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  getPool(): Pool {
    return this.pool;
  }

  async query<T>(text: string, params?: unknown[]): Promise<T[]> {
    const start = Date.now();
    const result = await this.pool.query(text, params);
    const duration = Date.now() - start;

    logger.debug({ query: text, duration, rows: result.rowCount }, 'Executed query');

    return result.rows as T[];
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}
