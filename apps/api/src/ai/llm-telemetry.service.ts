import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';

export interface LlmCallRecord {
  modelId?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  redacted?: boolean;
  failureCategory?: string;
  userId?: string;
  orgId?: string;
  promptType?: string;
  /** Truncated input sent to the LLM (max 500 chars). */
  inputSnippet?: string;
  /** Truncated output from the LLM (max 500 chars). */
  outputSnippet?: string;
  metadata?: Record<string, unknown>;
}

const MAX_SNIPPET_LENGTH = 500;

function truncate(text: string | undefined): string | undefined {
  if (!text) return undefined;
  return text.length > MAX_SNIPPET_LENGTH ? text.slice(0, MAX_SNIPPET_LENGTH) + '...[truncated]' : text;
}

@Injectable()
export class LlmTelemetryService {
  private readonly logger = new Logger(LlmTelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logInteraction(record: LlmCallRecord): Promise<void> {
    try {
      const metadata: Record<string, unknown> = {
        ...record.metadata,
        userId: record.userId,
        orgId: record.orgId,
        promptType: record.promptType,
        inputSnippet: truncate(record.inputSnippet),
        outputSnippet: truncate(record.outputSnippet),
      };

      await this.prisma.llmInteractionLog.create({
        data: {
          modelId: record.modelId,
          promptTokens: record.promptTokens,
          completionTokens: record.completionTokens,
          latencyMs: record.latencyMs,
          redacted: record.redacted ?? true,
          guardrailOutcome: record.failureCategory,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to log LLM interaction: ${(error as Error).message}`);
    }
  }

  async getRecentStats(minutes = 60): Promise<{
    totalCalls: number;
    avgLatencyMs: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    failures: number;
  }> {
    const since = new Date(Date.now() - minutes * 60_000);

    const logs = await this.prisma.llmInteractionLog.findMany({
      where: { createdAt: { gte: since } },
      select: {
        latencyMs: true,
        promptTokens: true,
        completionTokens: true,
        guardrailOutcome: true,
      },
    });

    const totalCalls = logs.length;
    const avgLatencyMs =
      totalCalls > 0
        ? Math.round(logs.reduce((sum, l) => sum + (l.latencyMs ?? 0), 0) / totalCalls)
        : 0;
    const totalPromptTokens = logs.reduce((sum, l) => sum + (l.promptTokens ?? 0), 0);
    const totalCompletionTokens = logs.reduce((sum, l) => sum + (l.completionTokens ?? 0), 0);
    const failures = logs.filter((l) => l.guardrailOutcome !== null).length;

    return { totalCalls, avgLatencyMs, totalPromptTokens, totalCompletionTokens, failures };
  }
}
