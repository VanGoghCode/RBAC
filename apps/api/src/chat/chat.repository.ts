import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

export interface ConversationRow {
  id: string;
  title: string | null;
  orgId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
}

export interface MessageRow {
  id: string;
  role: string;
  content: string;
  sourcesJson: unknown | null;
  guardrailResultJson: unknown | null;
  createdAt: Date;
}

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createConversation(userId: string, orgId: string, title?: string) {
    return this.prisma.chatConversation.create({
      data: { userId, orgId, title },
    });
  }

  async findConversationById(id: string, userId: string) {
    return this.prisma.chatConversation.findFirst({
      where: { id, userId },
    });
  }

  async findConversations(
    userId: string,
    options?: { limit?: number; before?: string },
  ): Promise<{ items: ConversationRow[]; hasMore: boolean }> {
    const limit = options?.limit ?? 20;
    const where: Record<string, unknown> = { userId };

    if (options?.before) {
      (where as Record<string, unknown>).id = { not: options.before };
      // Use cursor-based: find conversations with updatedAt before the 'before' conversation
      const beforeConv = await this.prisma.chatConversation.findFirst({
        where: { id: options.before, userId },
        select: { updatedAt: true },
      });
      if (beforeConv) {
        delete (where as Record<string, unknown>).id;
        (where as Record<string, unknown>).updatedAt = { lt: beforeConv.updatedAt };
      }
    }

    const conversations = await this.prisma.chatConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit + 1,
      include: { _count: { select: { messages: true } } },
    });

    const hasMore = conversations.length > limit;
    const items = conversations.slice(0, limit).map((c) => ({
      id: c.id,
      title: c.title,
      orgId: c.orgId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }));

    return { items, hasMore };
  }

  async findMessages(
    conversationId: string,
    options?: { limit?: number; cursor?: string },
  ): Promise<{ items: MessageRow[]; hasMore: boolean }> {
    const limit = options?.limit ?? 20;
    const where: Record<string, unknown> = { conversationId };

    if (options?.cursor) {
      (where as Record<string, unknown>).createdAt = {
        lt: (
          await this.prisma.chatMessage.findFirst({
            where: { id: options.cursor },
            select: { createdAt: true },
          })
        )?.createdAt ?? new Date(),
      };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = messages.slice(0, limit).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sourcesJson: m.sourcesJson,
      guardrailResultJson: m.guardrailResultJson,
      createdAt: m.createdAt,
    }));

    return { items, hasMore };
  }

  async saveMessage(
    conversationId: string,
    role: string,
    content: string,
    sourcesJson?: unknown,
    guardrailResultJson?: unknown,
  ) {
    return this.prisma.chatMessage.create({
      data: {
        conversationId,
        role,
        content,
        sourcesJson: sourcesJson ?? undefined,
        guardrailResultJson: guardrailResultJson ?? undefined,
      },
    });
  }

  async getRecentMessages(conversationId: string, limit: number): Promise<MessageRow[]> {
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse().map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sourcesJson: m.sourcesJson,
      guardrailResultJson: m.guardrailResultJson,
      createdAt: m.createdAt,
    }));
  }

  async updateConversationTitle(conversationId: string, title: string) {
    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }
}
