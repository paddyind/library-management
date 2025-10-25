import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from '../models/user.entity';

@Injectable()
export class ProfileService {
  constructor(private readonly usersService: UsersService) {}

  async getProfile(userId: string): Promise<User> {
    return this.usersService.findOne(userId);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<User> {
    return this.usersService.update(userId, updateProfileDto);
  }
}
