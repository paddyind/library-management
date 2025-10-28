import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateMemberDto } from '../dto/member.dto';
import type { Request } from 'express';
import { Member } from '../models/member.entity';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() req: Request) {
    const member = req.user as Member;
    return this.profileService.getProfile(member.id);
  }

  @Put()
  updateProfile(@Req() req: Request, @Body() updateProfileDto: UpdateMemberDto) {
    const member = req.user as Member;
    return this.profileService.updateProfile(member.id, updateProfileDto);
  }
}
