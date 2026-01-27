import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dtos/notification-query.dto';
import { Request } from 'express';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() req: Request, @Query() query: NotificationQueryDto) {
    const userId = req.user?.userId as string;
    return this.notificationsService.list(userId, query);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    const userId = req.user?.userId as string;
    return this.notificationsService.markAsRead(userId, id);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: Request) {
    const userId = req.user?.userId as string;
    return this.notificationsService.getUnreadCount(userId);
  }
}
