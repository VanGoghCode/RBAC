import { Module } from '@nestjs/common';
import { AuthorizationScopeService } from '@task-ai/auth';
import { AuditRepository, TaskRepository, VectorSearchRepository } from '@task-ai/tasks';
import { AiModule } from '../ai/ai.module';
import { PrismaModule, PrismaService } from '../prisma';
import { TaskDeduplicationService } from './task-deduplication.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskDeduplicationService,
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
export class TasksModule {}
