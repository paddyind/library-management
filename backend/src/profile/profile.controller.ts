import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateMemberDto } from '../dto/member.dto';
import type { Request } from 'express';
import { Member } from '../models/member.entity';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get user profile', description: 'Retrieve authenticated user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@Req() req: Request) {
    const member = req.user as Member;
    return this.profileService.getProfile(member.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user profile', description: 'Update authenticated user profile' })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  updateProfile(@Req() req: Request, @Body() updateProfileDto: UpdateMemberDto) {
    const member = req.user as Member;
    return this.profileService.updateProfile(member.id, updateProfileDto);
  }
}
