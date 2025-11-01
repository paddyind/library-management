import { Controller, Get, Post, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type { Request } from 'express';
import { Member } from '../members/member.interface';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications', description: 'Retrieve all notifications for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Req() req: Request) {
    const member = req.user as Member;
    return this.notificationsService.findAll(member.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread count', description: 'Get count of unread notifications' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(@Req() req: Request) {
    const member = req.user as Member;
    return this.notificationsService.getUnreadCount(member.id);
  }

  @Post(':id/mark-read')
  @ApiOperation({ summary: 'Mark notification as read', description: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all as read', description: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(@Req() req: Request) {
    const member = req.user as Member;
    return this.notificationsService.markAllAsRead(member.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification', description: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications', description: 'Delete all notifications for the user' })
  @ApiResponse({ status: 200, description: 'All notifications deleted' })
  removeAll(@Req() req: Request) {
    const member = req.user as Member;
    return this.notificationsService.removeAll(member.id);
  }
}

