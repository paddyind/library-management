import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthDto } from '../dto/auth.dto';
import { CreateMemberDto } from '../dto/member.dto';
import { MembersService } from '../members/members.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { SubscriptionTier } from '../models/subscription.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly membersService: MembersService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'User login', description: 'Authenticate user with email and password' })
  @ApiBody({ type: AuthDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() authDto: AuthDto) {
    const member = await this.authService.validateMember(authDto);
    if (!member) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(member);
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration', description: 'Create a new user account' })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async register(@Body() createMemberDto: CreateMemberDto) {
    const member = await this.membersService.create(createMemberDto);
    await this.subscriptionsService.create(member, createMemberDto.subscription || SubscriptionTier.FREE);
    return member;
  }
}
