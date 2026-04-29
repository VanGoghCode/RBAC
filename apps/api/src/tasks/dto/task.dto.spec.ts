import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskListQuerySchema,
  CreateCommentSchema,
  ActivityQuerySchema,
} from './task.dto';

describe('Task DTOs', () => {
  // ─── CreateTaskSchema ────────────────────────────────────────

  describe('CreateTaskSchema', () => {
    const valid = {
      title: 'Test task',
      orgId: '550e8400-e29b-41d4-a716-446655440000',
    };

    it('accepts valid minimal input', () => {
      const result = CreateTaskSchema.parse(valid);
      expect(result.title).toBe('Test task');
      expect(result.status).toBe('TODO');
      expect(result.priority).toBe('MEDIUM');
      expect(result.visibility).toBe('PUBLIC');
    });

    it('rejects empty title', () => {
      expect(() => CreateTaskSchema.parse({ ...valid, title: '' })).toThrow();
    });

    it('rejects whitespace-only title', () => {
      expect(() => CreateTaskSchema.parse({ ...valid, title: '   ' })).toThrow();
    });

    it('rejects title over 300 chars', () => {
      expect(() => CreateTaskSchema.parse({ ...valid, title: 'x'.repeat(301) })).toThrow();
    });

    it('rejects description over 5000 chars', () => {
      expect(() =>
        CreateTaskSchema.parse({ ...valid, description: 'x'.repeat(5001) }),
      ).toThrow();
    });

    it('rejects invalid status', () => {
      expect(() =>
        CreateTaskSchema.parse({ ...valid, status: 'INVALID' }),
      ).toThrow();
    });

    it('rejects invalid priority', () => {
      expect(() =>
        CreateTaskSchema.parse({ ...valid, priority: 'URGENT' }),
      ).toThrow();
    });

    it('rejects invalid due date', () => {
      expect(() =>
        CreateTaskSchema.parse({ ...valid, dueAt: 'not-a-date' }),
      ).toThrow();
    });

    it('rejects unknown fields (strict)', () => {
      expect(() =>
        CreateTaskSchema.parse({ ...valid, extraField: 'nope' }),
      ).toThrow();
    });

    it('rejects client-sent createdById', () => {
      expect(() =>
        CreateTaskSchema.parse({ ...valid, createdById: 'user-1' }),
      ).toThrow();
    });

    it('accepts valid ISO due date', () => {
      const result = CreateTaskSchema.parse({
        ...valid,
        dueAt: '2026-12-31T23:59:59Z',
      });
      expect(result.dueAt).toBe('2026-12-31T23:59:59Z');
    });

    it('trims title whitespace', () => {
      const result = CreateTaskSchema.parse({ ...valid, title: '  Hello  ' });
      expect(result.title).toBe('Hello');
    });
  });

  // ─── UpdateTaskSchema ────────────────────────────────────────

  describe('UpdateTaskSchema', () => {
    it('accepts partial update', () => {
      const result = UpdateTaskSchema.parse({ title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('accepts empty object', () => {
      const result = UpdateTaskSchema.parse({});
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('rejects unknown fields', () => {
      expect(() => UpdateTaskSchema.parse({ hack: true })).toThrow();
    });

    it('accepts null description', () => {
      const result = UpdateTaskSchema.parse({ description: null });
      expect(result.description).toBeNull();
    });

    it('accepts null assigneeId', () => {
      const result = UpdateTaskSchema.parse({
        assigneeId: null,
      });
      expect(result.assigneeId).toBeNull();
    });
  });

  // ─── TaskListQuerySchema ─────────────────────────────────────

  describe('TaskListQuerySchema', () => {
    it('applies defaults', () => {
      const result = TaskListQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.sort).toBe('updatedAt');
      expect(result.order).toBe('desc');
    });

    it('parses limit from string', () => {
      const result = TaskListQuerySchema.parse({ limit: '50' });
      expect(result.limit).toBe(50);
    });

    it('rejects limit over 100', () => {
      expect(() => TaskListQuerySchema.parse({ limit: '101' })).toThrow();
    });
  });

  // ─── CreateCommentSchema ─────────────────────────────────────

  describe('CreateCommentSchema', () => {
    it('rejects empty comment', () => {
      expect(() => CreateCommentSchema.parse({ comment: '' })).toThrow();
    });

    it('rejects whitespace-only comment', () => {
      expect(() => CreateCommentSchema.parse({ comment: '   ' })).toThrow();
    });

    it('rejects comment over 5000 chars', () => {
      expect(() =>
        CreateCommentSchema.parse({ comment: 'x'.repeat(5001) }),
      ).toThrow();
    });

    it('accepts HTML text in comment (stored as-is, sanitized on display)', () => {
      const result = CreateCommentSchema.parse({
        comment: '<script>alert("xss")</script>',
      });
      expect(result.comment).toBe('<script>alert("xss")</script>');
    });
  });

  // ─── ActivityQuerySchema ─────────────────────────────────────

  describe('ActivityQuerySchema', () => {
    it('applies defaults', () => {
      const result = ActivityQuerySchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.order).toBe('desc');
    });
  });
});
