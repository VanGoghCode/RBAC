/**
 * Database connection and pgvector extension smoke tests.
 * These tests require a running PostgreSQL container with pgvector.
 * Run `pnpm dev:db` before executing these tests.
 * Skipped automatically when DB is not reachable (CI-safe).
 */

import { createTestPrismaClient, isDbReachable } from './test-db-client';

describe('Database smoke tests', () => {
  let dbAvailable = false;
  let client: ReturnType<typeof createTestPrismaClient>;

  beforeAll(async () => {
    client = createTestPrismaClient();
    dbAvailable = await isDbReachable(client);
    if (!dbAvailable) {
      // eslint-disable-next-line no-console
      console.warn('Database not reachable — skipping DB smoke tests');
    }
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('should connect to PostgreSQL', async () => {
    if (!dbAvailable) return;
    const result = await client.$queryRaw<Array<{ connected: number }>>`SELECT 1 as connected`;
    expect(result[0].connected).toBe(1);
  });

  it('should have pgvector extension available', async () => {
    if (!dbAvailable) return;
    await client.$executeRaw`CREATE EXTENSION IF NOT EXISTS vector`;
    const result = await client.$queryRaw<
      Array<{ extname: string }>
    >`SELECT extname FROM pg_extension WHERE extname = 'vector'`;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].extname).toBe('vector');
  });
});
