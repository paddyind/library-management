import { IsString, IsEnum, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { NotificationType } from '../models/notification.entity';

export class CreateNotificationDto {
  @IsUUID()
  memberId: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}

export class UpdateNotificationDto {
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsString()
  @IsOptional()
  message?: string;
}

export class NotificationQueryDto {
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;
}
