import { z } from 'zod';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const TASK_VISIBILITIES = ['PUBLIC', 'ASSIGNED_ONLY', 'PRIVATE'] as const;

export const CreateTaskSchema = z
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
    status: z.enum(TASK_STATUSES).default('TODO'),
    priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
    category: z.string().trim().max(100).optional(),
    visibility: z.enum(TASK_VISIBILITIES).default('PUBLIC'),
    assigneeId: z.string().uuid().optional(),
    dueAt: z
      .string()
      .datetime({ message: 'Due date must be a valid ISO date' })
      .optional(),
    orgId: z.string().uuid('Organization ID is required'),
  })
  .strict();

export const UpdateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title must not be empty')
      .max(300, 'Title must be 300 characters or fewer')
      .optional(),
    description: z
      .string()
      .max(5000, 'Description must be 5000 characters or fewer')
      .nullable()
      .optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    category: z.string().trim().max(100).nullable().optional(),
    visibility: z.enum(TASK_VISIBILITIES).optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    dueAt: z
      .string()
      .datetime({ message: 'Due date must be a valid ISO date' })
      .nullable()
      .optional(),
  })
  .strict();

export const TaskListQuerySchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().uuid().optional(),
  orgId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .default(20),
  sort: z.enum(['updatedAt', 'createdAt', 'dueAt']).default('updatedAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const CreateCommentSchema = z
  .object({
    comment: z
      .string()
      .trim()
      .min(1, 'Comment must not be empty')
      .max(5000, 'Comment must be 5000 characters or fewer'),
  })
  .strict();

export const ActivityQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100))
    .default(20),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type TaskListQueryDto = z.infer<typeof TaskListQuerySchema>;
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;
export type ActivityQueryDto = z.infer<typeof ActivityQuerySchema>;
