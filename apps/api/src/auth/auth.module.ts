import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthorizationScopeService } from '@task-ai/auth';
import { AuditRepository } from '@task-ai/tasks';
import { PrismaModule, PrismaService } from '../prisma';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    {
      provide: AuditRepository,
      useFactory: (prisma: PrismaService) => new AuditRepository(prisma),
      inject: [PrismaService],
    },
    AuthorizationScopeService,
    {
      provide: APP_GUARD,
      useClass: JwtAccessGuard,
    },
  ],
  exports: [AuthService, AuthorizationScopeService],
})
export class AuthModule {}
