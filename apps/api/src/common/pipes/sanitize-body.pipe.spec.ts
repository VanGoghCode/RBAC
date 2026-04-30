import { SanitizeBodyPipe } from './sanitize-body.pipe';

describe('SanitizeBodyPipe', () => {
  let pipe: SanitizeBodyPipe;

  beforeEach(() => {
    pipe = new SanitizeBodyPipe();
  });

  it('strips constructor key from object', () => {
    const input = Object.assign({}, { email: 'a@b.com' }, { constructor: { prototype: {} } });
    const result = pipe.transform(input) as Record<string, unknown>;
    expect(result).toEqual({ email: 'a@b.com' });
    expect(Object.keys(result)).not.toContain('constructor');
  });

  it('strips prototype key from object', () => {
    const input = Object.assign({}, { title: 'task' }, { prototype: { polluted: true } });
    const result = pipe.transform(input) as Record<string, unknown>;
    expect(result).toEqual({ title: 'task' });
    expect(Object.keys(result)).not.toContain('prototype');
  });

  it('strips both constructor and prototype keys', () => {
    const input = Object.assign(
      {},
      { valid: 'data' },
      { constructor: { b: 2 } },
      { prototype: { c: 3 } },
    );
    const result = pipe.transform(input) as Record<string, unknown>;
    expect(result).toEqual({ valid: 'data' });
    expect(Object.keys(result)).toEqual(['valid']);
  });

  it('passes through objects without pollution keys unchanged', () => {
    const input = { name: 'test', email: 'a@b.com', age: 25 };
    const result = pipe.transform(input);
    expect(result).toEqual(input);
  });

  it('deep-sanitizes nested objects', () => {
    const inner = Object.assign({}, { deep: 'value' }, { constructor: 'oops' });
    const outer = Object.assign({}, { title: 'valid' }, { prototype: { polluted: true } }) as Record<string, unknown>;
    outer.nested = inner;

    const result = pipe.transform(outer) as Record<string, unknown>;
    const nested = result.nested as Record<string, unknown>;
    expect(result.title).toBe('valid');
    expect(Object.keys(result)).not.toContain('prototype');
    expect(Object.keys(nested)).not.toContain('constructor');
    expect(nested.deep).toBe('value');
  });

  it('deep-sanitizes arrays with pollution keys', () => {
    const item1 = Object.assign({}, { name: 'a' }, { constructor: 'bad1' });
    const item2 = Object.assign({}, { name: 'b' }, { prototype: 'bad2' });
    const result = pipe.transform([item1, item2]) as Record<string, unknown>[];
    expect(result[0]).toEqual({ name: 'a' });
    expect(result[1]).toEqual({ name: 'b' });
  });

  it('passes through non-object values', () => {
    expect(pipe.transform('string')).toBe('string');
    expect(pipe.transform(123)).toBe(123);
    expect(pipe.transform(null)).toBe(null);
    expect(pipe.transform(undefined)).toBe(undefined);
    expect(pipe.transform(true)).toBe(true);
  });

  it('passes through arrays without objects', () => {
    const input = [1, 'two', true, null];
    expect(pipe.transform(input)).toEqual([1, 'two', true, null]);
  });
});
