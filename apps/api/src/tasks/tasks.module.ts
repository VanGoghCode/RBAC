import { Module } from '@nestjs/common';
import { AuthorizationScopeService } from '@task-ai/auth';
import { TaskRepository, AuditRepository } from '@task-ai/tasks';
import { PrismaModule, PrismaService } from '../prisma';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule],
  controllers: [TasksController],
  providers: [
    TasksService,
    AuthorizationScopeService,
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
