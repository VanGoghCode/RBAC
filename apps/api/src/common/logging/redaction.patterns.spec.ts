import { redactSensitiveData } from './redaction.patterns';

describe('Redaction Patterns', () => {
  it('redacts JWT tokens', () => {
    const input = 'Token: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEyMyJ9.abc123def456ghi789jkl';
    const result = redactSensitiveData(input);
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(result).toContain('[REDACTED_JWT]');
  });

  it('redacts Bearer tokens', () => {
    const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.abc123def456ghi789jkl012';
    const result = redactSensitiveData(input);
    expect(result).not.toContain('eyJhbGciOiJIUzI1NiJ9');
    expect(result).toContain('[REDACTED_BEARER]');
  });

  it('redacts password fields', () => {
    const input = '{"email":"user@test.com","password":"s3cr3tP@ss"}';
    const result = redactSensitiveData(input);
    expect(result).not.toContain('s3cr3tP@ss');
    expect(result).toContain('"password":"[REDACTED]"');
  });

  it('redacts AWS access keys', () => {
    const input = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    const result = redactSensitiveData(input);
    expect(result).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(result).toContain('[REDACTED_AWS_KEY]');
  });

  it('redacts AWS secret keys', () => {
    const input = 'aws_secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
    const result = redactSensitiveData(input);
    expect(result).not.toContain('wJalrXUtnFEMI');
    expect(result).toContain('[REDACTED_AWS_SECRET]');
  });

  it('redacts database connection strings with passwords', () => {
    const input = 'DATABASE_URL=postgresql://admin:mysecretpassword@localhost:5432/mydb';
    const result = redactSensitiveData(input);
    expect(result).not.toContain('mysecretpassword');
    expect(result).toContain('[REDACTED]');
  });

  it('redacts canary hints', () => {
    const input = 'canary-present-len-32 [CANARY_REDACTED]abc-123-def';
    const result = redactSensitiveData(input);
    expect(result).toContain('[CANARY_REDACTED]');
  });

  it('preserves non-sensitive content', () => {
    const input = 'User created task "Fix login bug" in org-1';
    const result = redactSensitiveData(input);
    expect(result).toBe(input);
  });

  it('handles multiple sensitive patterns in one string', () => {
    const input =
      'User eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1InQ.abc123def456ghi789jkl012mno ' +
      'with "password":"hunter2" and key AKIAIOSFODNN7EXAMPLE';
    const result = redactSensitiveData(input);
    expect(result).toContain('[REDACTED_JWT]');
    expect(result).toContain('[REDACTED_AWS_KEY]');
    expect(result).not.toContain('hunter2');
  });

  it('handles empty string', () => {
    expect(redactSensitiveData('')).toBe('');
  });
});
