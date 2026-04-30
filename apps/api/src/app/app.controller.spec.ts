import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;
  let prismaMock: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prismaMock = { $queryRaw: jest.fn() };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('health', () => {
    it('should return status ok with timestamp', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.health();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('health/db', () => {
    it('should return ok when database is connected', async () => {
      prismaMock.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const appController = app.get<AppController>(AppController);
      const result = await appController.healthDb();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('connected');
      expect(result.timestamp).toBeDefined();
    });

    it('should throw when database is unavailable', async () => {
      prismaMock.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      const appController = app.get<AppController>(AppController);
      await expect(appController.healthDb()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('health/ai', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('should return ok when Bedrock config is present', () => {
      process.env.AWS_REGION = 'us-east-1';
      process.env.BEDROCK_LLM_MODEL_ID = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
      process.env.BEDROCK_EMBEDDING_MODEL_ID = 'amazon.titan-embed-text-v2:0';

      const appController = app.get<AppController>(AppController);
      const result = appController.healthAi();

      expect(result.status).toBe('ok');
      expect(result.provider).toBe('bedrock');
      expect(result.region).toBe('us-east-1');
      expect(result.configured).toBe(true);
    });

    it('should return degraded when config is missing', () => {
      delete process.env.AWS_REGION;
      delete process.env.BEDROCK_LLM_MODEL_ID;
      delete process.env.BEDROCK_EMBEDDING_MODEL_ID;

      const appController = app.get<AppController>(AppController);
      const result = appController.healthAi();

      expect(result.status).toBe('degraded');
      expect(result.configured).toBe(false);
      expect(result.message).toContain('AWS_REGION');
    });
  });
});
