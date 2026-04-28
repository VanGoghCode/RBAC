import { PrismaClient, Prisma } from '@prisma/client';

export class AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async log(data: {
    actorId?: string;
    orgId?: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
    ipHash?: string;
    userAgentHash?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async findMany(
    filters: {
      orgId?: string;
      actorId?: string;
      action?: string;
      resourceType?: string;
    },
    pagination: { limit: number; offset: number },
  ) {
    const limit = Math.min(pagination.limit, 100);
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.orgId) where.orgId = filters.orgId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.resourceType) where.resourceType = filters.resourceType;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: pagination.offset,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}
