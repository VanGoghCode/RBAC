import { Controller, Get, InternalServerErrorException, Logger } from '@nestjs/common';
import { Public } from '../auth/decorators';
import { PrismaService } from '../prisma';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  getData() {
    return this.appService.getData();
  }

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('health/db')
  async healthDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
      this.logger.error('Database health check failed', (error as Error).message);
      throw new InternalServerErrorException({ status: 'error', database: 'unavailable' });
    }
  }

  @Public()
  @Get('health/ai')
  healthAi() {
    const region = process.env.AWS_REGION;
    const llmModel = process.env.BEDROCK_LLM_MODEL_ID;
    const embedModel = process.env.BEDROCK_EMBEDDING_MODEL_ID;

    const missing: string[] = [];
    if (!region) missing.push('AWS_REGION');
    if (!llmModel) missing.push('BEDROCK_LLM_MODEL_ID');
    if (!embedModel) missing.push('BEDROCK_EMBEDDING_MODEL_ID');

    if (missing.length > 0) {
      return {
        status: 'degraded',
        message: `Missing config: ${missing.join(', ')}`,
        configured: false,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      status: 'ok',
      provider: 'bedrock',
      region,
      llmModel,
      embedModel,
      configured: true,
      timestamp: new Date().toISOString(),
    };
  }
}
