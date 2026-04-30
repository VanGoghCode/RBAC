import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

interface ErrorEnvelope {
  success: false;
  error: string;
  statusCode: number;
  details?: string;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly isDev = process.env['NODE_ENV'] === 'development';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const envelope = this.buildEnvelope(exception);

    // Log full details server-side
    if (exception instanceof Error) {
      this.logger.error(
        `${envelope.statusCode} ${envelope.error}`,
        exception.stack,
      );
    } else {
      this.logger.error(`${envelope.statusCode} ${envelope.error}`);
    }

    response.status(envelope.statusCode).json(envelope);
  }

  private buildEnvelope(exception: unknown): ErrorEnvelope {
    // ZodError → 400 with readable validation message
    if (exception instanceof ZodError) {
      const message = exception.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      return this.addDevDetails(
        { success: false, error: message, statusCode: HttpStatus.BAD_REQUEST },
        exception,
      );
    }

    // HttpException variants
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Map ForbiddenException (resource-level) → 404 to prevent enumeration
      if (status === HttpStatus.FORBIDDEN) {
        const msg = String(
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as Record<string, unknown>).message ?? exception.message,
        );

        // Only map to 404 if the message looks like a resource access denial
        if (this.isResourceAccessDenial(msg)) {
          return this.addDevDetails(
            {
              success: false,
              error: 'Not found',
              statusCode: HttpStatus.NOT_FOUND,
            },
            exception,
          );
        }
      }

      let message: string;
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        'message' in (exceptionResponse as object)
      ) {
        const msg = (exceptionResponse as { message: unknown }).message;
        message = Array.isArray(msg) ? msg.join('; ') : String(msg);
      } else {
        message = exception.message;
      }

      return this.addDevDetails(
        { success: false, error: message, statusCode: status },
        exception,
      );
    }

    // Unknown errors — safe generic message in production
    return this.addDevDetails(
      {
        success: false,
        error: this.isDev
          ? (exception as Error)?.message ?? 'Internal server error'
          : 'Internal server error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      },
      exception instanceof Error ? exception : undefined,
    );
  }

  private addDevDetails(
    envelope: ErrorEnvelope,
    error?: Error | unknown,
  ): ErrorEnvelope {
    if (this.isDev && error instanceof Error) {
      envelope.details = error.message;
      envelope.stack = error.stack;
    }
    return envelope;
  }

  private isResourceAccessDenial(message: string): boolean {
    const lower = message.toLowerCase();
    const resourcePatterns = [
      'cannot',
      'not allowed',
      'do not have',
      'no access',
      'forbidden',
      'permission',
      'not authorized',
    ];
    return resourcePatterns.some((p) => lower.includes(p));
  }
}
