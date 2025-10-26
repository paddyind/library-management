import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto } from '../dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Get all notifications for the current user
  @Get()
  async findAll(@Request() req, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findByUser(req.user.userId, query);
  }

  // Get unread count
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { count };
  }

  // Get a specific notification
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.notificationsService.findOne(id, req.user.userId);
  }

  // Mark notification as read
  @Post(':id/mark-read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  // Mark all notifications as read
  @Post('mark-all-read')
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.userId);
    return { message: 'All notifications marked as read' };
  }

  // Delete a notification
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    await this.notificationsService.remove(id, req.user.userId);
    return { message: 'Notification deleted successfully' };
  }

  // Delete all notifications
  @Delete()
  async removeAll(@Request() req) {
    await this.notificationsService.removeAll(req.user.userId);
    return { message: 'All notifications deleted successfully' };
  }
}
