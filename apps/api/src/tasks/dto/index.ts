export {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskListQuerySchema,
  CreateCommentSchema,
  ActivityQuerySchema,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_VISIBILITIES,
} from './task.dto';
export type {
  CreateTaskDto,
  UpdateTaskDto,
  TaskListQueryDto,
  CreateCommentDto,
  ActivityQueryDto,
} from './task.dto';
export {
  DeduplicateCheckSchema,
  DedupDecisionSchema,
  CreateTaskWithDedupSchema,
  DEDUP_DECISIONS,
} from './dedup.dto';
export type {
  DedupDecision,
  DeduplicateCheckDto,
  CreateTaskWithDedupDto,
  DeduplicationCandidate,
  DeduplicationCheckResult,
  DedupConflictResponse,
} from './dedup.dto';
