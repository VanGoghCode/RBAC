import { ConsoleLogger, Injectable } from '@nestjs/common';
import { redactSensitiveData } from './redaction.patterns';

/**
 * Custom NestJS logger that redacts sensitive data from all log output.
 *
 * Wraps the default ConsoleLogger and applies redaction patterns
 * to every string argument before delegating to the parent logger.
 */
@Injectable()
export class RedactingLogger extends ConsoleLogger {
  log(message: unknown, ...optionalParams: unknown[]): void {
    super.log.apply(this, [this.redact(message), ...optionalParams.map((p) => this.redact(p))]);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    super.error.apply(this, [this.redact(message), ...optionalParams.map((p) => this.redact(p))]);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn.apply(this, [this.redact(message), ...optionalParams.map((p) => this.redact(p))]);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    super.debug.apply(this, [this.redact(message), ...optionalParams.map((p) => this.redact(p))]);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    super.verbose.apply(this, [this.redact(message), ...optionalParams.map((p) => this.redact(p))]);
  }

  private redact(value: unknown): unknown {
    if (typeof value === 'string') {
      return redactSensitiveData(value);
    }
    if (typeof value === 'object' && value !== null) {
      try {
        const json = JSON.stringify(value);
        return redactSensitiveData(json);
      } catch {
        return value;
      }
    }
    return value;
  }
}
