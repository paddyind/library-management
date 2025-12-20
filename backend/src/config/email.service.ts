import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD');
    const smtpFrom = this.configService.get<string>('SMTP_FROM', smtpUser || 'noreply@library.com');

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.warn('Email service not configured. SMTP settings missing. Email notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log('Email service initialized');
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent to ${to}: Email service not configured`);
      return false;
    }

    try {
      const smtpFrom = this.configService.get<string>('SMTP_FROM', 'noreply@library.com');
      
      await this.transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text: text || html.replace(/<[^>]*>/g, ''),
        html,
      });

      this.logger.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}:`, error.message);
      return false;
    }
  }

  async sendReviewApprovalEmail(memberEmail: string, memberName: string, bookTitle: string, approved: boolean, reason?: string): Promise<boolean> {
    const subject = approved 
      ? `Your review for "${bookTitle}" has been approved`
      : `Your review for "${bookTitle}" has been rejected`;

    const html = approved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Review Approved</h2>
          <p>Dear ${memberName},</p>
          <p>Your review for "<strong>${bookTitle}</strong>" has been approved and is now visible to other members.</p>
          <p>Thank you for sharing your thoughts!</p>
          <p>Best regards,<br>Library Management Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Review Rejected</h2>
          <p>Dear ${memberName},</p>
          <p>Unfortunately, your review for "<strong>${bookTitle}</strong>" has been rejected.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you have any questions, please contact the library administration.</p>
          <p>Best regards,<br>Library Management Team</p>
        </div>
      `;

    return this.sendEmail(memberEmail, subject, html);
  }

  async sendRatingApprovalEmail(memberEmail: string, memberName: string, bookTitle: string, approved: boolean, reason?: string): Promise<boolean> {
    const subject = approved 
      ? `Your rating for "${bookTitle}" has been approved`
      : `Your rating for "${bookTitle}" has been rejected`;

    const html = approved
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Rating Approved</h2>
          <p>Dear ${memberName},</p>
          <p>Your rating for "<strong>${bookTitle}</strong>" has been approved and is now included in the book's average rating.</p>
          <p>Thank you for your feedback!</p>
          <p>Best regards,<br>Library Management Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Rating Rejected</h2>
          <p>Dear ${memberName},</p>
          <p>Unfortunately, your rating for "<strong>${bookTitle}</strong>" has been rejected.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
          <p>If you have any questions, please contact the library administration.</p>
          <p>Best regards,<br>Library Management Team</p>
        </div>
      `;

    return this.sendEmail(memberEmail, subject, html);
  }
}

