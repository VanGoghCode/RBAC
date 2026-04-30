import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Sse,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Observable, from, map } from 'rxjs';
import { Throttle } from '@nestjs/throttler';
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

  @Sse('ask/stream')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  askStream(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Observable<MessageEvent> {
    const dto = ChatAskSchema.parse(body);
    return from(this.service.ask(user.userId, dto)).pipe(
      map((result) => {
        const event = new MessageEvent('message', {
          data: JSON.stringify({
            type: 'complete',
            answer: result.answer,
            sources: result.sources,
            conversationId: result.conversationId,
            userMessageId: result.userMessageId,
            assistantMessageId: result.assistantMessageId,
            intent: result.intent,
            guardrailSafe: result.guardrailSafe,
            latencyMs: result.latencyMs,
          }),
        });
        return event;
      }),
    );
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
