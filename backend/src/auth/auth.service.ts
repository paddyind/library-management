import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembersService } from '../members/members.service';
import { AuthDto } from '../dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly membersService: MembersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateMember(authDto: AuthDto): Promise<any> {
    const { email, password } = authDto;
    const member = await this.membersService.findByEmail(email);
    if (member && (await bcrypt.compare(password, member.password))) {
      const { password, ...result } = member;
      return result;
    }
    return null;
  }

  async login(member: any) {
    const payload = { email: member.email, sub: member.id, role: member.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
