import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dtos/create-task.dto';
import { Request } from 'express';
import { TaskQueryDto } from './dtos/task-query.dto';
import { UpdateTaskDto } from './dtos/update-task.dto';

@UseGuards(TenantGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Req() req: Request, @Body() dto: CreateTaskDto) {
    const userId = req.user?.userId ?? req.get('x-user-id') ?? undefined;
    return this.tasksService.create(req.tenantId as string, userId, dto);
  }

  @Get()
  list(@Req() req: Request, @Query() query: TaskQueryDto) {
    return this.tasksService.list(req.tenantId as string, query);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(req.tenantId as string, id);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    const userId = req.user?.userId ?? req.get('x-user-id') ?? undefined;
    return this.tasksService.update(req.tenantId as string, id, userId, dto);
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(req.tenantId as string, id);
  }
}
