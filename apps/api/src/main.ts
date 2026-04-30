import { json, Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SanitizeBodyPipe } from './common/pipes/sanitize-body.pipe';
import { RedactingLogger } from './common/logging/redacting-logger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Security middleware
  app.use(helmet());
  // Disable x-powered-by as defense-in-depth alongside helmet
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('x-powered-by');
    next();
  });

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:4200';
  app.enableCors({ origin: corsOrigin, credentials: true });

  // Request body size limit (10kb)
  app.use(json({ limit: '10kb' }));

  app.use(cookieParser());

  // Global filter: consistent error envelope
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global pipe: strip prototype-pollution keys
  app.useGlobalPipes(new SanitizeBodyPipe());

  // Custom logger: redact sensitive data
  app.useLogger(new RedactingLogger());

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
