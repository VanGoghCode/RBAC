/**
 * Redaction patterns for sensitive data in log output.
 *
 * Each pattern matches a category of sensitive data and replaces
 * it with a safe placeholder.
 */

// JWT tokens (ey... format, two dots separating base64url segments)
export const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

// Password fields in JSON-like strings
export const PASSWORD_PATTERN = /"password"\s*:\s*"[^"]*"/g;

// Bearer tokens in Authorization headers
export const BEARER_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

// AWS Access Key IDs (start with AKIA or ASIA, followed by 16 alphanumeric chars)
export const AWS_KEY_PATTERN = /(?:AKIA|ASIA)[0-9A-Z]{16}/g;

// AWS Secret Access Keys (40-char base64-like string after known key patterns)
export const AWS_SECRET_PATTERN = /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/gi;

// Database connection strings with passwords
export const DB_CONNECTION_PATTERN = /:\/\/[^:]+:([^@]+)@/g;

// Canary tokens (GUID-like patterns after "CANARY:" label or canary token context)
export const CANARY_HINT_PATTERN = /\[CANARY_REDACTED\][\w-]*/g;

/**
 * Apply all redaction patterns to a string.
 * Returns the redacted string with sensitive data replaced.
 */
export function redactSensitiveData(input: string): string {
  let result = input;

  // Bearer tokens (most specific, apply first)
  result = result.replace(BEARER_PATTERN, '[REDACTED_BEARER]');

  // JWT tokens
  result = result.replace(JWT_PATTERN, '[REDACTED_JWT]');

  // Password fields
  result = result.replace(PASSWORD_PATTERN, '"password":"[REDACTED]"');

  // AWS keys
  result = result.replace(AWS_KEY_PATTERN, '[REDACTED_AWS_KEY]');
  result = result.replace(AWS_SECRET_PATTERN, '[REDACTED_AWS_SECRET]');

  // DB connection strings
  result = result.replace(DB_CONNECTION_PATTERN, '://[REDACTED]:[REDACTED]@');

  // Canary hints
  result = result.replace(CANARY_HINT_PATTERN, '[CANARY_REDACTED]');

  return result;
}
