import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto } from '../dto/notification.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // Get all notifications for the current user
  @Get()
  @ApiOperation({ summary: 'Get user notifications', description: 'Retrieve all notifications for authenticated user' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findByMember(req.user.sub, query);
  }

  // Get unread count
  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count', description: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { count };
  }

  // Get a specific notification
  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID', description: 'Retrieve a specific notification' })
  @ApiResponse({ status: 200, description: 'Notification found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.notificationsService.findOne(id, req.user.sub);
  }

  // Mark notification as read
  @Post(':id/mark-read')
  @ApiOperation({ summary: 'Mark as read', description: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.sub);
  }

  // Mark all notifications as read
  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all as read', description: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Request() req) {
    await this.notificationsService.markAllAsRead(req.user.sub);
    return { message: 'All notifications marked as read' };
  }

  // Delete a notification
  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification', description: 'Delete a specific notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async remove(@Param('id') id: string, @Request() req) {
    await this.notificationsService.remove(id, req.user.sub);
    return { message: 'Notification deleted successfully' };
  }

  // Delete all notifications
  @Delete()
  @ApiOperation({ summary: 'Delete all notifications', description: 'Delete all notifications for user' })
  @ApiResponse({ status: 200, description: 'All notifications deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeAll(@Request() req) {
    await this.notificationsService.removeAll(req.user.sub);
    return { message: 'All notifications deleted successfully' };
  }
}
