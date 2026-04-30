import { Module } from '@nestjs/common';
import { AuthorizationScopeService } from '@task-ai/auth';
import { TaskRepository, AuditRepository } from '@task-ai/tasks';
import { AiModule } from '../ai/ai.module';
import { PrismaModule, PrismaService } from '../prisma';
import { TasksModule } from '../tasks';
import { ChatController } from './chat.controller';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { IntentDetector } from './intent/intent-detector';
import {
  GuardrailService,
  InputNormalizer,
  PromptBoundary,
  OutputValidator,
  CanaryService,
} from './guardrails';

@Module({
  imports: [PrismaModule, AiModule, TasksModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRepository,
    IntentDetector,
    GuardrailService,
    InputNormalizer,
    PromptBoundary,
    OutputValidator,
    CanaryService,
    {
      provide: AuthorizationScopeService,
      useFactory: (prisma: PrismaService) => new AuthorizationScopeService(prisma),
      inject: [PrismaService],
    },
    {
      provide: TaskRepository,
      useFactory: (prisma: PrismaService) => new TaskRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: AuditRepository,
      useFactory: (prisma: PrismaService) => new AuditRepository(prisma),
      inject: [PrismaService],
    },
  ],
})
export class ChatModule {}
