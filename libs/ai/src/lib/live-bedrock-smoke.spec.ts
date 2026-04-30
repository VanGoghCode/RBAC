/**
 * Live Bedrock smoke tests.
 *
 * These tests make real AWS calls and are gated behind:
 *   RUN_LIVE_BEDROCK_TESTS=true
 *
 * They should NEVER run in CI. Run locally only when needed.
 * Keep calls small to minimize cost.
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { BedrockEmbeddingClient } from './embedding/bedrock-embedding-client';
import { BedrockLlmClient } from './llm/bedrock-llm-client';

const shouldRun = process.env['RUN_LIVE_BEDROCK_TESTS'] === 'true';

const region = process.env['AWS_REGION'] ?? 'us-east-1';
const modelId = process.env['BEDROCK_LLM_MODEL_ID'] ?? 'anthropic.claude-sonnet-4-20250514';
const embeddingModelId = process.env['BEDROCK_EMBEDDING_MODEL_ID'] ?? 'amazon.titan-embed-text-v2:0';

describe('Live Bedrock Smoke Tests', () => {
  const client = new BedrockRuntimeClient({ region });

  it('LLM returns non-empty response', async () => {
    if (!shouldRun) return;
    const llm = new BedrockLlmClient(client, modelId, { maxTokens: 50, temperature: 0, timeoutMs: 15000 });
    const result = await llm.complete('Reply with just the word "hello".');
    expect(result.content.trim().toLowerCase()).toContain('hello');
    expect(result.latencyMs).toBeGreaterThan(0);
    expect(result.modelId).toBe(modelId);
  }, 30000);

  it('Embedding returns correct dimensions', async () => {
    if (!shouldRun) return;
    const embedding = new BedrockEmbeddingClient(client, embeddingModelId);
    const result = await embedding.embedText('test embedding');
    expect(result.embedding.length).toBeGreaterThan(0);
    expect(result.modelId).toBeTruthy();
    expect(result.latencyMs).toBeGreaterThan(0);
  }, 30000);
});
