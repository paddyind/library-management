import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsObject()
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
  };
}
