import { PrismaClient } from '@prisma/client';
import { AuthorizationScope } from '@task-ai/shared/types';

export interface VectorSearchResult {
  taskId: string;
  title: string;
  similarity: number;
  orgId: string;
  visibility: string;
}

export class VectorSearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Search embeddings filtered by org and visibility BEFORE similarity.
   * Never returns cross-org results.
   */
  async search(
    scope: AuthorizationScope,
    embedding: number[],
    options?: {
      limit?: number;
      minSimilarity?: number;
    },
  ): Promise<VectorSearchResult[]> {
    const limit = Math.min(options?.limit ?? 10, 100);
    const minSimilarity = options?.minSimilarity ?? 0.5;
    const vectorLiteral = `[${embedding.join(',')}]`;

    const visibilityFilter = this.getVisibilityFilter(scope);

    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ task_id: string; title: string; similarity: number; org_id: string; visibility: string }>
    >(
      `SELECT
         te.task_id,
         t.title,
         1 - (te.embedding <=> $1::vector) AS similarity,
         te.org_id,
         te.visibility
       FROM task_embeddings te
       JOIN tasks t ON t.id = te.task_id AND t.deleted_at IS NULL
       WHERE te.org_id = ANY($2)
         AND te.stale_at IS NULL
         AND (${visibilityFilter.sql})
         AND (1 - (te.embedding <=> $1::vector)) >= $3
       ORDER BY te.embedding <=> $1::vector
       LIMIT $4`,
      vectorLiteral,
      scope.allowedOrgIds,
      minSimilarity,
      limit,
    );

    return rows.map((r) => ({
      taskId: r.task_id,
      title: r.title,
      similarity: r.similarity,
      orgId: r.org_id,
      visibility: r.visibility,
    }));
  }

  private getVisibilityFilter(scope: AuthorizationScope): { sql: string } {
    const orgs = scope.allowedOrgIds;
    const isAdmin = Object.values(scope.rolesByOrg)
      .flat()
      .some((r) => r === 'admin' || r === 'owner');

    if (isAdmin) {
      return { sql: "te.visibility IN ('PUBLIC', 'ASSIGNED_ONLY', 'PRIVATE')" };
    }

    return {
      sql: `(
        te.visibility = 'PUBLIC'
        OR (te.visibility = 'ASSIGNED_ONLY' AND te.assignee_id = '${scope.actorUserId}')
        OR (te.visibility = 'PRIVATE' AND t.created_by_id = '${scope.actorUserId}')
      )`,
    };
  }
}
