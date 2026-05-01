/**
 * Reindex stale task embeddings.
 * Run: pnpm ai:reindex
 *
 * Requires DATABASE_URL and valid AWS credentials for Bedrock.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddingClient } from '@task-ai/ai';
import { createHash } from 'crypto';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://taskai:taskai@localhost:5432/taskai',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const region = process.env.AWS_REGION ?? 'us-east-1';
const embeddingModelId = process.env.BEDROCK_EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0';

function buildCompositeText(task: any): { text: string; contentHash: string } {
  const parts = [
    `Title: ${task.title}`,
    task.description ? `Description: ${task.description}` : '',
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    task.category ? `Category: ${task.category}` : '',
    task.assignee?.name ? `Assignee: ${task.assignee.name}` : '',
    task.dueAt ? `Due: ${new Date(task.dueAt).toISOString()}` : '',
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : '',
  ];

  if (task.activities?.length) {
    const activityText = task.activities
      .map((a: any) => a.comment || `${a.type}: ${a.fromValue} → ${a.toValue}`)
      .filter(Boolean)
      .join('; ');
    if (activityText) parts.push(`Recent Activity: ${activityText}`);
  }

  const text = parts.filter(Boolean).join('\n');
  const contentHash = createHash('sha256').update(text).digest('hex');
  return { text, contentHash };
}

async function main() {
  const bedrockClient = new BedrockRuntimeClient({ region });
  const embeddingClient = new BedrockEmbeddingClient(bedrockClient, embeddingModelId);

  const tasks = await prisma.task.findMany({
    where: { deletedAt: null },
    include: {
      assignee: { select: { name: true } },
      activities: {
        where: { type: 'COMMENT' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          type: true,
          fromValue: true,
          toValue: true,
          comment: true,
          createdAt: true,
        },
      },
      embedding: true,
    },
  });

  console.log(`Found ${tasks.length} tasks. Indexing...`);

  let indexed = 0;
  let skipped = 0;
  let failed = 0;

  for (const task of tasks) {
    if (task.embedding && !task.embedding.staleAt && task.embedding.contentHash !== '') {
      skipped++;
      continue;
    }

    try {
      const composite = buildCompositeText(task);

      if (task.embedding && task.embedding.contentHash === composite.contentHash && task.embedding.contentHash !== '') {
        await prisma.taskEmbedding.update({
          where: { id: task.embedding.id },
          data: { staleAt: null },
        });
        skipped++;
        continue;
      }

      const result = await embeddingClient.embedText(composite.text);
      const vectorStr = `[${result.embedding.join(',')}]`;

      await prisma.$executeRaw`
        INSERT INTO task_embeddings (id, task_id, org_id, assignee_id, visibility, embedding_model, content_hash, embedding, indexed_at, stale_at, embedding_version)
        VALUES (
          gen_random_uuid(),
          ${task.id}::uuid,
          ${task.orgId}::uuid,
          ${task.assigneeId}::uuid,
          ${task.visibility}::"TaskVisibility",
          ${result.modelId},
          ${composite.contentHash},
          ${vectorStr}::vector,
          now(),
          NULL,
          1
        )
        ON CONFLICT (task_id) DO UPDATE SET
          org_id = EXCLUDED.org_id,
          assignee_id = EXCLUDED.assignee_id,
          visibility = EXCLUDED.visibility,
          embedding_model = EXCLUDED.embedding_model,
          content_hash = EXCLUDED.content_hash,
          embedding = EXCLUDED.embedding,
          indexed_at = now(),
          stale_at = NULL,
          embedding_version = task_embeddings.embedding_version + 1
      `;

      indexed++;
      console.log(`  Indexed: "${task.title}"`);
    } catch (error) {
      console.error(`  Failed: "${task.title}" - ${(error as Error).message}`);
      failed++;
    }
  }

  console.log(`\nReindex complete: ${indexed} indexed, ${skipped} skipped, ${failed} failed`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
