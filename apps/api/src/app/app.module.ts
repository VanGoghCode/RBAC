import { Module } from '@nestjs/common';
import { AuthModule } from '../auth';
import { PrismaModule } from '../prisma';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
