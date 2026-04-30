import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';

export interface CanaryCheckResult {
  leaked: boolean;
  redactedContent: string;
}

@Injectable()
export class CanaryService {
  private readonly logger = new Logger(CanaryService.name);
  private readonly canaryToken: string;

  constructor() {
    // Use env-specific canary or generate one
    this.canaryToken = process.env.CANARY_TOKEN ?? `canary-${randomUUID()}`;
  }

  /** Get the canary token (for prompt injection only — never expose to user). */
  getToken(): string {
    return this.canaryToken;
  }

  /** Check if content contains the canary token. */
  check(content: string): CanaryCheckResult {
    const leaked = content.includes(this.canaryToken);
    let redactedContent = content;

    if (leaked) {
      redactedContent = content.split(this.canaryToken).join('[REDACTED_CANARY]');
      this.logger.error('CANARY TOKEN LEAKED IN MODEL OUTPUT — blocking response');
    }

    // Also check case-insensitive (partial defense)
    const lowerContent = content.toLowerCase();
    const lowerCanary = this.canaryToken.toLowerCase();
    if (!leaked && lowerContent.includes(lowerCanary)) {
      redactedContent = content.replace(
        new RegExp(this.escapeRegex(this.canaryToken), 'gi'),
        '[REDACTED_CANARY]',
      );
      this.logger.error('CANARY TOKEN LEAKED (case variant) IN MODEL OUTPUT — blocking response');
      return { leaked: true, redactedContent };
    }

    return { leaked, redactedContent };
  }

  /** Redact canary from log content. */
  redactForLogs(content: string): string {
    return content.split(this.canaryToken).join('[CANARY_REDACTED]');
  }

  /** Get a masked hint for audit logs (confirms presence without revealing value). */
  getAuditHint(): string {
    return `canary-present-len-${this.canaryToken.length}`;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
