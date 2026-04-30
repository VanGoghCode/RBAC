import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  TaskListQuerySchema,
  CreateCommentSchema,
  ActivityQuerySchema,
  DeduplicateCheckSchema,
  CreateTaskWithDedupSchema,
} from './dto';
import { TaskDeduplicationService } from './task-deduplication.service';
import { TasksService } from './tasks.service';
import type { AuthenticatedUser } from '@task-ai/shared/types';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly service: TasksService,
    private readonly dedupService: TaskDeduplicationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const dto = CreateTaskWithDedupSchema.parse(body);
    return this.service.createWithDedup(user.userId, dto);
  }

  @Post('deduplicate')
  async checkDuplicates(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const dto = DeduplicateCheckSchema.parse(body);
    return this.dedupService.checkForDuplicates(user.userId, dto);
  }

  @Get()
  async findMany(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string>,
  ) {
    const dto = TaskListQuerySchema.parse(query);
    return this.service.findMany(user.userId, dto);
  }

  @Get(':id')
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.findById(user.userId, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = UpdateTaskSchema.parse(body);
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.remove(user.userId, id);
  }

  @Get(':id/activity')
  async getActivities(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: Record<string, string>,
  ) {
    const dto = ActivityQuerySchema.parse(query);
    return this.service.getActivities(user.userId, id, dto);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const dto = CreateCommentSchema.parse(body);
    return this.service.addComment(user.userId, id, dto);
  }
}
