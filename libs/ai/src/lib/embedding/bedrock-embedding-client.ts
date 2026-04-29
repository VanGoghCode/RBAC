import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { EmbeddingClient, EmbeddingResponse } from './embedding-client.interface';
import { EMBEDDING_DIMENSIONS } from './embedding-client.interface';
import { withRetry } from '../retry/retry-policy';
import { validateVectorDimensions } from './vector-validator';

export class BedrockEmbeddingClient implements EmbeddingClient {
  constructor(
    private readonly client: BedrockRuntimeClient,
    private readonly modelId: string,
    private readonly timeoutMs: number = 15000,
  ) {}

  async embedText(text: string): Promise<EmbeddingResponse> {
    const start = Date.now();

    return withRetry(
      async () => {
        const body = JSON.stringify({ inputText: text });

        const command = new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body,
        });

        const response = await this.client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        const embedding = responseBody.embedding as number[];
        validateVectorDimensions(embedding, EMBEDDING_DIMENSIONS);

        return {
          embedding,
          modelId: this.modelId,
          latencyMs: Date.now() - start,
        };
      },
      { maxRetries: 2, timeoutMs: this.timeoutMs },
    );
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    // Titan embed supports single text only — batch sequentially
    const results: EmbeddingResponse[] = [];
    for (const text of texts) {
      results.push(await this.embedText(text));
    }
    return results;
  }
}
