// Bedrock client
export { createBedrockClient } from './lib/bedrock/bedrock-client.factory';
export type { BedrockConfig } from './lib/bedrock/bedrock-client.factory';

// LLM client
export type { LlmClient, LlmResponse, LlmOptions } from './lib/llm/llm-client.interface';
export { BedrockLlmClient } from './lib/llm/bedrock-llm-client';

// Embedding client
export type { EmbeddingClient, EmbeddingResponse } from './lib/embedding/embedding-client.interface';
export { EMBEDDING_DIMENSIONS } from './lib/embedding/embedding-client.interface';
export { BedrockEmbeddingClient } from './lib/embedding/bedrock-embedding-client';

// Vector validation
export { validateVectorDimensions, VectorDimensionError } from './lib/embedding/vector-validator';

// Retry policy
export { withRetry, isRetryable, RetryExhaustedError, TimeoutError } from './lib/retry/retry-policy';
export type { RetryOptions } from './lib/retry/retry-policy';

// Prompts
export { PromptRenderer } from './lib/prompts/prompt-renderer';
export type { RenderedPrompt } from './lib/prompts/prompt-renderer';
export { RAG_SYSTEM_PROMPT } from './lib/prompts/rag-system.prompt';
export { TASK_CREATION_PROMPT } from './lib/prompts/task-creation.prompt';
export { GUARDRAIL_PROMPT } from './lib/prompts/guardrail.prompt';
export { PROMPT_MANIFEST, getPromptVersion } from './lib/prompts/prompt-manifest';
export type { PromptManifestEntry } from './lib/prompts/prompt-manifest';

// Test fakes — never calls AWS
export { FakeEmbeddingClient, cosineSimilarity } from './lib/embedding/fake-embedding-client';
export { FakeLlmClient } from './lib/llm/fake-llm-client-impl';
export type { FakeLlmResponse } from './lib/llm/fake-llm-client-impl';
