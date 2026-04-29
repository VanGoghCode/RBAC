import { validateVectorDimensions, VectorDimensionError } from './vector-validator';

describe('validateVectorDimensions', () => {
  it('passes when dimensions match', () => {
    expect(() => validateVectorDimensions(new Array(1024).fill(0.1), 1024)).not.toThrow();
  });

  it('throws VectorDimensionError when dimensions mismatch', () => {
    expect(() => validateVectorDimensions(new Array(512).fill(0.1), 1024)).toThrow(
      VectorDimensionError,
    );
  });

  it('includes expected and actual in error message', () => {
    expect(() => validateVectorDimensions(new Array(256).fill(0.1), 1024)).toThrow(
      'expected 1024, got 256',
    );
  });
});
