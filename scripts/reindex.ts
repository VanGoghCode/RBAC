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
import { BedrockEmbeddingClient, TaskCompositeTextBuilder } from '@task-ai/ai';
import { TaskVisibility } from '@prisma/client';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://taskai:taskai@localhost:5432/taskai',
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const region = process.env.AWS_REGION ?? 'us-east-1';
const embeddingModelId = process.env.BEDROCK_EMBEDDING_MODEL_ID ?? 'amazon.titan-embed-text-v2:0';

async function main() {
  const bedrockClient = new BedrockRuntimeClient({ region });
  const embeddingClient = new BedrockEmbeddingClient(bedrockClient, embeddingModelId);
  const textBuilder = new TaskCompositeTextBuilder();

  // Find tasks without embeddings or with stale embeddings
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

  // eslint-disable-next-line no-console
  console.log(`Found ${tasks.length} tasks. Indexing...`);

  let indexed = 0;
  let skipped = 0;
  let failed = 0;

  for (const task of tasks) {
    // Skip if embedding is fresh (not stale)
    if (task.embedding && !task.embedding.staleAt && task.embedding.contentHash !== '') {
      skipped++;
      continue;
    }

    try {
      const composite = textBuilder.build(task, {
        assigneeName: task.assignee?.name,
        activities: task.activities.map((a) => ({
          type: a.type,
          fromValue: a.fromValue,
          toValue: a.toValue,
          comment: a.comment,
          createdAt: a.createdAt.toISOString(),
        })),
      });

      // Skip if content unchanged
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
      // eslint-disable-next-line no-console
      console.log(`  Indexed: "${task.title}"`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`  Failed: "${task.title}" - ${(error as Error).message}`);
      failed++;
    }
  }

  // eslint-disable-next-line no-console
  console.log(`\nReindex complete: ${indexed} indexed, ${skipped} skipped, ${failed} failed`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
