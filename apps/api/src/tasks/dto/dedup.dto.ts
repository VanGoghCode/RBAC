import { z } from 'zod';

export const DEDUP_DECISIONS = ['MERGE', 'SKIP', 'CREATE_ANYWAY', 'DISMISSED'] as const;
export type DedupDecision = (typeof DEDUP_DECISIONS)[number];

export const DeduplicateCheckSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(300, 'Title must be 300 characters or fewer'),
    description: z
      .string()
      .max(5000, 'Description must be 5000 characters or fewer')
      .optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    category: z.string().trim().max(100).optional(),
    tags: z.array(z.string().trim().max(50)).max(10).optional(),
    assigneeId: z.string().uuid().optional(),
    dueAt: z
      .string()
      .datetime({ message: 'Due date must be a valid ISO date' })
      .optional(),
    orgId: z.string().uuid('Organization ID is required'),
  })
  .strict();

export const DedupDecisionSchema = z.enum(DEDUP_DECISIONS);

export const CreateTaskWithDedupSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(300, 'Title must be 300 characters or fewer'),
    description: z
      .string()
      .max(5000, 'Description must be 5000 characters or fewer')
      .optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).default('TODO'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    category: z.string().trim().max(100).optional(),
    visibility: z.enum(['PUBLIC', 'ASSIGNED_ONLY', 'PRIVATE']).default('PUBLIC'),
    assigneeId: z.string().uuid().optional(),
    dueAt: z
      .string()
      .datetime({ message: 'Due date must be a valid ISO date' })
      .optional(),
    tags: z.array(z.string().trim().max(50)).max(10).default([]),
    orgId: z.string().uuid('Organization ID is required'),
    dedupDecision: DedupDecisionSchema.optional(),
    dedupRationale: z.string().trim().max(500).optional(),
  })
  .strict();

export interface DeduplicationCandidate {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  assigneeName: string | null;
  updatedAt: string;
  similarity: number;
}

export interface DeduplicationCheckResult {
  candidates: DeduplicationCandidate[];
  hasDuplicates: boolean;
}

export interface DedupConflictResponse {
  statusCode: number;
  message: string;
  candidates: DeduplicationCandidate[];
}

export type DeduplicateCheckDto = z.infer<typeof DeduplicateCheckSchema>;
export type CreateTaskWithDedupDto = z.infer<typeof CreateTaskWithDedupSchema>;
