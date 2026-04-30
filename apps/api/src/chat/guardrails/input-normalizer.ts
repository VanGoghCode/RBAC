import { Injectable, Logger } from '@nestjs/common';
import { HIGH_RISK_PHRASES, BENIGN_PATTERNS } from './threat-model';

export interface InputNormalizationResult {
  normalized: string;
  originalLength: number;
  truncated: boolean;
  flagged: boolean;
  flaggedPhrases: string[];
  isBenign: boolean;
}

const DEFAULT_MAX_LENGTH = 2000;

@Injectable()
export class InputNormalizer {
  private readonly logger = new Logger(InputNormalizer.name);

  normalize(raw: string, maxLength = DEFAULT_MAX_LENGTH): InputNormalizationResult {
    const original = raw;
    const originalLength = original.length;

    // Trim excessive whitespace (collapse multiple spaces/newlines but preserve meaning)
    let normalized = raw.replace(/\s+/g, ' ').trim();

    // Enforce maximum length
    const truncated = normalized.length > maxLength;
    if (truncated) {
      normalized = normalized.slice(0, maxLength);
    }

    // Detect high-risk phrases (case-insensitive, whitespace-collapsed)
    const lowered = normalized.toLowerCase();
    const flaggedPhrases: string[] = [];

    for (const phrase of HIGH_RISK_PHRASES) {
      if (lowered.includes(phrase.toLowerCase())) {
        flaggedPhrases.push(phrase);
      }
    }

    // Check if this is actually a benign query
    const isBenign = BENIGN_PATTERNS.some((pattern) => pattern.test(original));

    // Flagged only if high-risk phrases found AND not benign
    const flagged = flaggedPhrases.length > 0 && !isBenign;

    if (flagged) {
      this.logger.warn(`Input flagged for high-risk phrases: ${flaggedPhrases.join(', ')}`);
    }

    return {
      normalized,
      originalLength,
      truncated,
      flagged,
      flaggedPhrases,
      isBenign,
    };
  }

  /** Check if a string contains high-risk patterns without normalizing. */
  isFlagged(text: string): boolean {
    const lowered = text.toLowerCase();
    const hasRisk = HIGH_RISK_PHRASES.some((phrase) =>
      lowered.includes(phrase.toLowerCase()),
    );
    if (!hasRisk) return false;
    // Check benign override
    return !BENIGN_PATTERNS.some((pattern) => pattern.test(text));
  }
}
