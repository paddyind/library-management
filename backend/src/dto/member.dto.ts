import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { SubscriptionTier } from '../models/subscription.entity';

export class CreateMemberDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.FREE })
  @IsEnum(SubscriptionTier)
  subscription: SubscriptionTier;
}

export class UpdateMemberDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'test@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  notificationPreferences?: {
    email?: boolean;
    sms?: boolean;
  };
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
