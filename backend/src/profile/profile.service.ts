import { Injectable } from '@nestjs/common';
import { MembersService } from '../members/members.service';
import { UpdateMemberDto } from '../dto/member.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly membersService: MembersService) {}

  async getProfile(memberId: string) {
    return this.membersService.findOne(memberId);
  }

  async updateProfile(memberId: string, updateProfileDto: UpdateMemberDto) {
    return this.membersService.update(memberId, updateProfileDto);
  }
}
