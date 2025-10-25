import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../models/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() req: Request): Promise<User> {
    const userId = (req.user as any).id;
    return this.profileService.getProfile(userId);
  }

  @Put()
  updateProfile(@Req() req: Request, @Body() updateProfileDto: UpdateProfileDto): Promise<User> {
    const userId = (req.user as any).id;
    return this.profileService.updateProfile(userId, updateProfileDto);
  }
}
