import type { EmbeddingClient, EmbeddingResponse } from './embedding-client.interface';

/**
 * Deterministic fake embedding client for tests.
 * Never calls AWS. Returns consistent vectors keyed by input text.
 */
export class FakeEmbeddingClient implements EmbeddingClient {
  private readonly dimension: number;
  private readonly fixtureMap: Map<string, number[]>;

  constructor(options?: { dimension?: number; fixtures?: Record<string, number[]> }) {
    this.dimension = options?.dimension ?? 1024;
    this.fixtureMap = new Map(Object.entries(options?.fixtures ?? {}));
  }

  async embedText(text: string): Promise<EmbeddingResponse> {
    const embedding = this.fixtureMap.get(text) ?? this.deterministicVector(text);
    return {
      embedding,
      modelId: 'fake-embedding-model',
      latencyMs: 1,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResponse[]> {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }

  /** Generate deterministic vector from text using simple hash. */
  private deterministicVector(text: string): number[] {
    const vec: number[] = [];
    for (let i = 0; i < this.dimension; i++) {
      const charCode = text.charCodeAt(i % text.length) || 0;
      vec.push(((charCode * 31 + i * 17) % 1000) / 1000);
    }
    // Normalize
    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return vec.map((v) => v / mag);
  }
}

/**
 * Returns a fixed similarity between two vectors for test assertions.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
