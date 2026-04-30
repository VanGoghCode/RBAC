import { validateApiEnv, validateWebEnv } from './config';

const validApiEnv = {
  DATABASE_URL: 'postgresql://taskai:taskai@localhost:5432/taskai',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  AWS_REGION: 'us-east-1',
  BEDROCK_LLM_MODEL_ID: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  BEDROCK_EMBEDDING_MODEL_ID: 'amazon.titan-embed-text-v2:0',
  RATE_LIMIT_TTL: '60',
  RATE_LIMIT_MAX: '100',
  NODE_ENV: 'development',
  PORT: '3000',
};

describe('validateApiEnv', () => {
  it('should parse valid environment', () => {
    const result = validateApiEnv(validApiEnv);
    expect(result.DATABASE_URL).toBe(validApiEnv.DATABASE_URL);
    expect(result.RATE_LIMIT_TTL).toBe(60);
    expect(result.RATE_LIMIT_MAX).toBe(100);
    expect(result.PORT).toBe(3000);
  });

  it('should apply defaults for optional fields', () => {
    const minimal = { ...validApiEnv };
    const result = validateApiEnv(minimal);
    expect(result.NODE_ENV).toBe('development');
    expect(result.RATE_LIMIT_TTL).toBe(60);
  });

  it('should fail when DATABASE_URL is empty', () => {
    expect(() => validateApiEnv({ ...validApiEnv, DATABASE_URL: '' })).toThrow(
      'DATABASE_URL is required',
    );
  });

  it('should fail when DATABASE_URL is missing', () => {
    const { DATABASE_URL: _, ...without } = validApiEnv;
    expect(() => validateApiEnv(without as any)).toThrow('DATABASE_URL');
  });

  it('should fail when JWT secrets are too short', () => {
    expect(() => validateApiEnv({ ...validApiEnv, JWT_ACCESS_SECRET: 'short' })).toThrow(
      'at least 32 characters',
    );
  });

  it('should fail for invalid numeric configuration', () => {
    expect(() => validateApiEnv({ ...validApiEnv, RATE_LIMIT_MAX: '-1' })).toThrow();
  });

  it('should parse new AI config fields with defaults', () => {
    const result = validateApiEnv(validApiEnv);
    expect(result.AI_PROVIDER).toBe('bedrock');
    expect(result.BEDROCK_MAX_OUTPUT_TOKENS).toBe(1024);
    expect(result.MAX_CHAT_REQUESTS_PER_MINUTE).toBe(10);
    expect(result.DEDUP_SIMILARITY_THRESHOLD).toBe(0.92);
  });

  it('should accept custom AI config values', () => {
    const result = validateApiEnv({
      ...validApiEnv,
      AI_PROVIDER: 'bedrock',
      BEDROCK_MAX_OUTPUT_TOKENS: '2048',
      MAX_CHAT_REQUESTS_PER_MINUTE: '5',
      DEDUP_SIMILARITY_THRESHOLD: '0.85',
    });
    expect(result.BEDROCK_MAX_OUTPUT_TOKENS).toBe(2048);
    expect(result.MAX_CHAT_REQUESTS_PER_MINUTE).toBe(5);
    expect(result.DEDUP_SIMILARITY_THRESHOLD).toBe(0.85);
  });

  it('should reject DEDUP_SIMILARITY_THRESHOLD outside 0-1', () => {
    expect(() => validateApiEnv({ ...validApiEnv, DEDUP_SIMILARITY_THRESHOLD: '1.5' })).toThrow();
    expect(() => validateApiEnv({ ...validApiEnv, DEDUP_SIMILARITY_THRESHOLD: '-0.1' })).toThrow();
  });

  it('should not leak secrets in error messages', () => {
    try {
      validateApiEnv({ ...validApiEnv, DATABASE_URL: '' });
      fail('Should have thrown');
    } catch (error) {
      const message = String(error);
      expect(message).not.toContain(validApiEnv.JWT_ACCESS_SECRET);
      expect(message).not.toContain(validApiEnv.JWT_REFRESH_SECRET);
    }
  });
});

describe('validateWebEnv', () => {
  it('should parse valid environment', () => {
    const result = validateWebEnv({
      API_BASE_URL: 'http://localhost:3000',
      FEATURE_AI_CHAT: 'true',
      FEATURE_SEMANTIC_DEDUP: 'false',
    });
    expect(result.API_BASE_URL).toBe('http://localhost:3000');
    expect(result.FEATURE_AI_CHAT).toBe(true);
    expect(result.FEATURE_SEMANTIC_DEDUP).toBe(false);
  });

  it('should fail for invalid URL', () => {
    expect(() => validateWebEnv({ API_BASE_URL: 'not-a-url' })).toThrow();
  });

  it('should apply defaults', () => {
    const result = validateWebEnv({});
    expect(result.API_BASE_URL).toBe('http://localhost:3000');
    expect(result.FEATURE_AI_CHAT).toBe(true);
  });

  it('should not expose AWS secrets in web config', () => {
    const result = validateWebEnv({ API_BASE_URL: 'http://localhost:3000' });
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('AWS');
    expect(resultStr).not.toContain('SECRET');
    expect(resultStr).not.toContain('BEDROCK');
    expect(resultStr).not.toContain('REGION');
    expect(resultStr).not.toContain('PASSWORD');
  });
});
