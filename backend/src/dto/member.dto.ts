import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { SubscriptionTier } from '../subscriptions/subscription.interface';
import { MemberRole } from '../members/member.interface';

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

  @ApiProperty({ enum: SubscriptionTier, example: SubscriptionTier.FREE, required: false })
  @IsEnum(SubscriptionTier)
  @IsOptional()
  subscription?: SubscriptionTier;

  @ApiProperty({ enum: MemberRole, example: MemberRole.MEMBER, required: false })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;
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

  @ApiProperty({ example: '+1234567890', description: 'Phone number (required)' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: '1990-01-01', description: 'Date of birth (YYYY-MM-DD)', required: false })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @ApiProperty({ example: '123 Main St, City, State', description: 'Physical address', required: false })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Prefers fiction books', description: 'User preferences', required: false })
  @IsString()
  @IsOptional()
  preferences?: string;

  @ApiProperty({ enum: MemberRole, example: MemberRole.MEMBER, required: false })
  @IsEnum(MemberRole)
  @IsOptional()
  role?: MemberRole;
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
