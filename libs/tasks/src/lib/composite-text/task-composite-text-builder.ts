import { createHash } from 'node:crypto';
import type { Task } from '@prisma/client';

interface ActivityEntry {
  type: string;
  fromValue?: string | null;
  toValue?: string | null;
  comment?: string | null;
  createdAt: string;
}

export interface CompositeTextResult {
  text: string;
  contentHash: string;
}

const MAX_ACTIVITY_ENTRIES = 5;
const MAX_COMMENT_LENGTH = 200;
const MAX_TOTAL_LENGTH = 4000;

export class TaskCompositeTextBuilder {
  build(
    task: Pick<Task, 'title' | 'description' | 'status' | 'priority' | 'category' | 'dueAt' | 'visibility'>,
    options?: {
      assigneeName?: string;
      activities?: ActivityEntry[];
    },
  ): CompositeTextResult {
    const parts: string[] = [];

    // Title — always first, most important for semantic search
    parts.push(`Title: ${task.title}`);

    // Description
    if (task.description) {
      parts.push(`Description: ${task.description}`);
    }

    // Category
    if (task.category) {
      parts.push(`Category: ${task.category}`);
    }

    // Status
    parts.push(`Status: ${task.status}`);

    // Priority
    parts.push(`Priority: ${task.priority}`);

    // Due date
    if (task.dueAt) {
      parts.push(`Due: ${task.dueAt.toISOString()}`);
    }

    // Assignee — only for PUBLIC and ASSIGNED_ONLY, not PRIVATE
    if (options?.assigneeName && task.visibility !== 'PRIVATE') {
      parts.push(`Assignee: ${options.assigneeName}`);
    }

    // Recent activity summary — high-signal events first, truncated
    if (options?.activities && options.activities.length > 0) {
      const activityTexts = options.activities
        .slice(0, MAX_ACTIVITY_ENTRIES)
        .map((a) => this.activityToText(a));

      if (activityTexts.length > 0) {
        parts.push(`Recent activity: ${activityTexts.join('; ')}`);
      }
    }

    const text = this.truncate(parts.join('\n'), MAX_TOTAL_LENGTH);
    const contentHash = this.hash(text);

    return { text, contentHash };
  }

  private activityToText(entry: ActivityEntry): string {
    switch (entry.type) {
      case 'STATUS_CHANGE':
        return `status ${entry.fromValue ?? 'none'} → ${entry.toValue ?? 'none'}`;
      case 'PRIORITY_CHANGE':
        return `priority ${entry.fromValue ?? 'none'} → ${entry.toValue ?? 'none'}`;
      case 'ASSIGNMENT_CHANGE':
        return `assignee ${entry.fromValue ?? 'unassigned'} → ${entry.toValue ?? 'unassigned'}`;
      case 'DUE_DATE_CHANGE':
        return `due date ${entry.fromValue ?? 'none'} → ${entry.toValue ?? 'none'}`;
      case 'COMMENT': {
        const truncated = (entry.comment ?? '').slice(0, MAX_COMMENT_LENGTH);
        return `comment: ${truncated}`;
      }
      default:
        return `${entry.type}`;
    }
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  private hash(text: string): string {
    // Normalize: trim trailing whitespace and collapse internal whitespace
    const normalized = text.trim().replace(/\s+/g, ' ');
    return createHash('sha256').update(normalized).digest('hex');
  }
}
