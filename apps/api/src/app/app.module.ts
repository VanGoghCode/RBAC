import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { PrismaModule } from '../prisma';
import { TasksModule } from '../tasks';
import { AiModule } from '../ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, AuthModule, TasksModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
