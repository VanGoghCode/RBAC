import { z } from 'zod';

export const ChatAskSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message must not be empty')
      .max(2000, 'Message must be 2000 characters or fewer'),
    conversationId: z.string().uuid().optional(),
    orgId: z.string().uuid('Organization ID is required'),
  })
  .strict();

export const ChatHistoryQuerySchema = z.object({
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(50))
    .default(20),
  before: z.string().uuid().optional(),
});

export const ConversationMessagesQuerySchema = z.object({
  limit: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(50))
    .default(20),
  cursor: z.string().optional(),
});

export type ChatAskDto = z.infer<typeof ChatAskSchema>;
export type ChatHistoryQueryDto = z.infer<typeof ChatHistoryQuerySchema>;
export type ConversationMessagesQueryDto = z.infer<typeof ConversationMessagesQuerySchema>;
