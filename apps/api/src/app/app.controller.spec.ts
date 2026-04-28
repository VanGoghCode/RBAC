import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({message: 'Hello API'});
    });
  });

  describe('health', () => {
    it('should return status ok', () => {
      const appController = app.get<AppController>(AppController);
      const result = appController.health();
      expect(result.status).toBe('ok');
      expect(result.timestamp).toBeDefined();
    });
  });
});
