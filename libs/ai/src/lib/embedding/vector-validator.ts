export class VectorDimensionError extends Error {
  constructor(expected: number, actual: number) {
    super(`Vector dimension mismatch: expected ${expected}, got ${actual}`);
    this.name = 'VectorDimensionError';
  }
}

export function validateVectorDimensions(vector: number[], expected: number): void {
  if (vector.length !== expected) {
    throw new VectorDimensionError(expected, vector.length);
  }
}
