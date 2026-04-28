/**
 * Shared helper to create a PrismaClient for tests.
 * Uses @prisma/adapter-pg for Prisma 7 compatibility.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

export function createTestPrismaClient(): PrismaClient {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://taskai:taskai@localhost:5432/taskai',
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter } as any);
}

export async function isDbReachable(client: PrismaClient): Promise<boolean> {
  try {
    await client.$connect();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch {
    try { await client.$disconnect(); } catch { /* ignore */ }
    return false;
  }
}
