/**
 * Database connection and pgvector extension smoke tests.
 * These tests require a running PostgreSQL container with pgvector.
 * Run `pnpm dev:db` before executing these tests.
 * Skipped automatically when DB is not reachable (CI-safe).
 */

import { Client } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://taskai:taskai@localhost:5432/taskai';

async function isDbReachable(): Promise<boolean> {
  const client = new Client(DATABASE_URL);
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    return false;
  }
}

describe('Database smoke tests', () => {
  let dbAvailable = false;

  beforeAll(async () => {
    dbAvailable = await isDbReachable();
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('Database not reachable — skipping DB smoke tests');
    }
  });

  it('should connect to PostgreSQL', async () => {
    if (!dbAvailable) return;
    const client = new Client(DATABASE_URL);
    try {
      await client.connect();
      const result = await client.query('SELECT 1 as connected');
      expect(result.rows[0].connected).toBe(1);
    } finally {
      await client.end();
    }
  });

  it('should have pgvector extension available', async () => {
    if (!dbAvailable) return;
    const client = new Client(DATABASE_URL);
    try {
      await client.connect();
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      const result = await client.query(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'",
      );
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].extname).toBe('vector');
    } finally {
      await client.end();
    }
  });
});
