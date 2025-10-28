import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { Notification, NotificationType } from '../models/notification.entity';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto } from '../dto/notification.dto';

@Injectable()
export class NotificationsService {
  private transporter: Transporter;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private configService: ConfigService,
  ) {
    // Initialize email transporter (optional - won't fail if not configured)
    try {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('SMTP_HOST') || 'localhost',
        port: this.configService.get<number>('SMTP_PORT') || 587,
        secure: this.configService.get<boolean>('SMTP_SECURE') || false,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
    } catch (error) {
      console.warn('Email transporter not configured:', error.message);
    }
  }

  // Create a new notification
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(createNotificationDto);
    return this.notificationRepository.save(notification);
  }

  // Get all notifications for a member
  async findByMember(memberId: string, query?: NotificationQueryDto): Promise<Notification[]> {
    const whereClause: any = { memberId };
    
    if (query?.isRead !== undefined) {
      whereClause.isRead = query.isRead;
    }
    
    if (query?.type) {
      whereClause.type = query.type;
    }

    return this.notificationRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  // Get a single notification
  async findOne(id: string, memberId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, memberId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${id}" not found`);
    }

    return notification;
  }

  // Mark notification as read
  async markAsRead(id: string, memberId: string): Promise<Notification> {
    const notification = await this.findOne(id, memberId);
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  // Mark all notifications as read for a member
  async markAllAsRead(memberId: string): Promise<void> {
    await this.notificationRepository.update(
      { memberId, isRead: false },
      { isRead: true },
    );
  }

  // Update a notification
  async update(id: string, memberId: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    const notification = await this.findOne(id, memberId);
    Object.assign(notification, updateNotificationDto);
    return this.notificationRepository.save(notification);
  }

  // Delete a notification
  async remove(id: string, memberId: string): Promise<void> {
    const notification = await this.findOne(id, memberId);
    await this.notificationRepository.remove(notification);
  }

  // Delete all notifications for a member
  async removeAll(memberId: string): Promise<void> {
    await this.notificationRepository.delete({ memberId });
  }

  // Get unread count for a member
  async getUnreadCount(memberId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { memberId, isRead: false },
    });
  }

  // Send email notification (optional - won't fail if email not configured)
  async sendMail(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      console.warn('Email transporter not available. Skipping email.');
      return;
    }

    try {
      const mailOptions = {
        from: '"Library Management System" <noreply@library.com>',
        to,
        subject,
        text,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send email:', error.message);
      // Don't throw - email is optional
    }
  }

  // Helper method to create notification for book overdue
  async createOverdueNotification(memberId: string, bookTitle: string): Promise<Notification> {
    return this.create({
      memberId,
      message: `Book "${bookTitle}" is overdue. Please return it as soon as possible.`,
      type: NotificationType.OVERDUE,
    });
  }

  // Helper method to create notification for book due soon
  async createDueSoonNotification(memberId: string, bookTitle: string, dueDate: Date): Promise<Notification> {
    return this.create({
      memberId,
      message: `Book "${bookTitle}" is due on ${dueDate.toDateString()}. Please return it on time.`,
      type: NotificationType.DUE_SOON,
    });
  }

  // Helper method to create reservation ready notification
  async createReservationReadyNotification(memberId: string, bookTitle: string): Promise<Notification> {
    return this.create({
      memberId,
      message: `Book "${bookTitle}" is now available for pickup. Your reservation is ready!`,
      type: NotificationType.RESERVATION_READY,
    });
  }
}
