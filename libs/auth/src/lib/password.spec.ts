import { hashPassword, verifyPassword } from './password';

describe('password utilities', () => {
  it('should hash and verify round-trip', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).toBeDefined();
    expect(await verifyPassword('secret123', hash)).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('should reject empty password', async () => {
    const hash = await hashPassword('secret123');
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('should produce different hashes for same password (salt)', async () => {
    const a = await hashPassword('same');
    const b = await hashPassword('same');
    expect(a).not.toBe(b);
  });
});
