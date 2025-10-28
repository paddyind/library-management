import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from '../dto/auth.dto';
import { CreateMemberDto } from '../dto/member.dto';
import { MembersService } from '../members/members.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionTier } from '../models/subscription.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly membersService: MembersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('login')
  async login(@Body() authDto: AuthDto) {
    const member = await this.authService.validateMember(authDto);
    if (!member) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(member);
  }

  @Post('register')
  async register(@Body() createMemberDto: CreateMemberDto) {
    const member = await this.membersService.create(createMemberDto);
    await this.subscriptionsService.create(member, createMemberDto.subscription || SubscriptionTier.FREE);
    return member;
  }
}
