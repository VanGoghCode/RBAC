import { FakeEmbeddingClient, cosineSimilarity } from './fake-embedding-client';
import { validateVectorDimensions } from './vector-validator';

describe('FakeEmbeddingClient', () => {
  it('returns consistent embedding for same input', async () => {
    const client = new FakeEmbeddingClient();
    const a = await client.embedText('hello world');
    const b = await client.embedText('hello world');
    expect(a.embedding).toEqual(b.embedding);
  });

  it('returns different embeddings for different inputs', async () => {
    const client = new FakeEmbeddingClient();
    const a = await client.embedText('hello');
    const b = await client.embedText('world');
    expect(a.embedding).not.toEqual(b.embedding);
  });

  it('returns correct dimension', async () => {
    const client = new FakeEmbeddingClient({ dimension: 512 });
    const result = await client.embedText('test');
    expect(result.embedding).toHaveLength(512);
  });

  it('batch returns correct count', async () => {
    const client = new FakeEmbeddingClient();
    const results = await client.embedBatch(['a', 'b', 'c']);
    expect(results).toHaveLength(3);
    results.forEach((r) => expect(r.embedding).toHaveLength(1024));
  });

  it('uses fixture vectors when provided', async () => {
    const fixture = new Array(1024).fill(0.5);
    const client = new FakeEmbeddingClient({
      fixtures: { 'my test input': fixture },
    });
    const result = await client.embedText('my test input');
    expect(result.embedding).toEqual(fixture);
  });

  it('embedding passes dimension validation', async () => {
    const client = new FakeEmbeddingClient({ dimension: 1024 });
    const result = await client.embedText('test');
    expect(() => validateVectorDimensions(result.embedding, 1024)).not.toThrow();
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const vec = [1, 0, 0];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('similar texts produce higher similarity than dissimilar', async () => {
    const client = new FakeEmbeddingClient();
    const a = await client.embedText('fix login bug');
    const b = await client.embedText('fix login bug urgent');
    const c = await client.embedText('deploy cloud infrastructure');
    const simAB = cosineSimilarity(a.embedding, b.embedding);
    const simAC = cosineSimilarity(a.embedding, c.embedding);
    expect(simAB).toBeGreaterThan(simAC);
  });
});
