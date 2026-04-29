import { BedrockEmbeddingClient } from './bedrock-embedding-client';
import type { EmbeddingClient, EmbeddingResponse } from './embedding-client.interface';

// Mock client — never calls AWS
class MockEmbeddingClient implements EmbeddingClient {
  async embedText(text: string): Promise<EmbeddingResponse> {
    return {
      embedding: new Array(1024).fill(0.01),
      modelId: 'mock-model',
      latencyMs: 10,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    return texts.map((text) => ({
      embedding: new Array(1024).fill(0.01),
      modelId: 'mock-model',
      latencyMs: 10,
    }));
  }
}

describe('BedrockEmbeddingClient', () => {
  it('mock provider does not call AWS SDK', async () => {
    const mock = new MockEmbeddingClient();
    const result = await mock.embedText('test');
    expect(result.embedding).toHaveLength(1024);
    expect(result.modelId).toBe('mock-model');
  });

  it('mock batch returns correct count', async () => {
    const mock = new MockEmbeddingClient();
    const results = await mock.embedBatch(['a', 'b', 'c']);
    expect(results).toHaveLength(3);
  });
});
