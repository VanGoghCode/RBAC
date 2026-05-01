import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { CurrentUser } from '../auth/decorators';
import { ThrottlerBehindProxyGuard } from '../auth/guards';
import { ChatService } from './chat.service';
import {
  ChatAskSchema,
  ChatHistoryQuerySchema,
  ConversationMessagesQuerySchema,
} from './dto';
import type { AuthenticatedUser } from '@task-ai/shared/types';

@Controller('chat')
@UseGuards(ThrottlerBehindProxyGuard)
export class ChatController {
  constructor(private readonly service: ChatService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async ask(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const dto = ChatAskSchema.parse(body);
    return this.service.ask(user.userId, dto);
  }

  @Post('ask/stream')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async askStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const dto = ChatAskSchema.parse(body);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      for await (const event of this.service.askStream(user.userId, dto)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'error', text: 'Stream failed unexpectedly.' })}\n\n`);
    }

    res.end();
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const dto = ChatHistoryQuerySchema.parse(query);
    return this.service.getHistory(user.userId, dto);
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    const dto = ConversationMessagesQuerySchema.parse(query);
    return this.service.getConversation(user.userId, id, dto);
  }
}
