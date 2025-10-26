import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from '../dto/user.dto';
import type { Request } from 'express';
import { User } from '../models/user.entity';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() req: Request) {
    const user = req.user as User;
    return this.profileService.getProfile(user.id);
  }

  @Put()
  updateProfile(@Req() req: Request, @Body() updateProfileDto: UpdateProfileDto) {
    const user = req.user as User;
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }
}
