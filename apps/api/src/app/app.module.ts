import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth';
import { ChatModule } from '../chat/chat.module';
import { PrismaModule } from '../prisma';
import { TasksModule } from '../tasks';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, AuthModule, TasksModule, AiModule, ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
