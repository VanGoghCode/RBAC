import { PipeTransform, Injectable } from '@nestjs/common';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

@Injectable()
export class SanitizeBodyPipe implements PipeTransform {
  transform(value: unknown): unknown {
    return this.deepSanitize(value);
  }

  private deepSanitize(value: unknown): unknown {
    if (typeof value !== 'object' || value === null) return value;

    if (Array.isArray(value)) {
      return value.map((v) => this.deepSanitize(v));
    }

    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      if (PROTOTYPE_POLLUTION_KEYS.has(key)) continue;
      sanitized[key] = this.deepSanitize((value as Record<string, unknown>)[key]);
    }
    return sanitized;
  }
}
