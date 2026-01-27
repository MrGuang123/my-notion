import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { NotificationType } from './notification-type.enum';
import { NotificationQueryDto } from './dtos/notification-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    payload: Record<string, unknown>,
  ) {
    const notification = this.notificationRepo.create({
      userId,
      type,
      payload,
    });

    return this.notificationRepo.save(notification);
  }

  async list(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const unreadOnly = query.unreadOnly ?? false;

    const qb = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (unreadOnly) {
      qb.andWhere('notification.read = :read', { read: false });
    }

    const [items, total] = await qb
      .orderBy('notification.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async markAsRead(userId: string, id: number) {
    const notification = await this.notificationRepo.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Not your notification');
    }

    notification.read = true;
    return this.notificationRepo.save(notification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { userId, read: false },
    });
  }
}
