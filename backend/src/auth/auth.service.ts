import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MembersService } from '../members/members.service';
import { LoginDto, CreateMemberDto } from '../dto/member.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthenticationProvider, ProviderType } from '../models/authentication-provider.entity';
import { Repository } from 'typeorm';
import { Member } from '../models/member.entity';

@Injectable()
export class AuthService {
  constructor(
    private membersService: MembersService,
    private jwtService: JwtService,
    private subscriptionsService: SubscriptionsService,
    @InjectRepository(AuthenticationProvider)
    private readonly authProviderRepository: Repository<AuthenticationProvider>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const member = await this.membersService.findByEmail(email);
    if (member) {
      const authProvider = await this.authProviderRepository.findOne({
        where: { member: { id: member.id }, provider: ProviderType.LOCAL },
      });
      if (authProvider && await bcrypt.compare(password, member.password)) {
        const { password, ...result } = member;
        return result;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const member = await this.validateUser(loginDto.email, loginDto.password);
    if (!member) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { email: member.email, sub: member.id, role: member.role };
    return {
      access_token: this.jwtService.sign(payload),
      member,
    };
  }

  async register(createMemberDto: CreateMemberDto) {
    const member = await this.membersService.create(createMemberDto);

    const authProvider = this.authProviderRepository.create({
      member,
      provider: ProviderType.LOCAL,
      providerId: member.id,
    });
    await this.authProviderRepository.save(authProvider);

    const subscriptionTier = createMemberDto.subscription || 'FREE';
    await this.subscriptionsService.create(member, subscriptionTier as any, 0);
    return member;
  }
}
