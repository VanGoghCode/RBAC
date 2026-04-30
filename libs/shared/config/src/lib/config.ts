import { z } from 'zod';

const apiEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  BEDROCK_LLM_MODEL_ID: z.string().min(1, 'BEDROCK_LLM_MODEL_ID is required'),
  BEDROCK_EMBEDDING_MODEL_ID: z.string().min(1, 'BEDROCK_EMBEDDING_MODEL_ID is required'),
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN is required').default('http://localhost:4200'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validateApiEnv(env: Record<string, string | undefined>): ApiEnv {
  const result = apiEnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return result.data;
}

const webEnvSchema = z.object({
  API_BASE_URL: z.string().url('API_BASE_URL must be a valid URL').default('http://localhost:3000'),
  FEATURE_AI_CHAT: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  FEATURE_SEMANTIC_DEDUP: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function validateWebEnv(env: Record<string, string | undefined>): WebEnv {
  const result = webEnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  return result.data;
}
