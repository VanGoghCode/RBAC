export interface EmbeddingResponse {
  embedding: number[];
  modelId: string;
  latencyMs: number;
}

export interface EmbeddingClient {
  embedText(text: string): Promise<EmbeddingResponse>;
  embedBatch(texts: string[]): Promise<EmbeddingResponse[]>;
}

export const EMBEDDING_DIMENSIONS = 1024;
