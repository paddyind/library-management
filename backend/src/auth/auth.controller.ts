import { Controller, Post, Body, GoneException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { getIamProvider } from '../config/iam-provider.util';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private assertLegacyAuth(): void {
    if (getIamProvider(this.configService) === 'keycloak') {
      throw new GoneException(
        'Legacy auth is disabled. Sign in via Keycloak OIDC (IAM_PROVIDER=keycloak).',
      );
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'User registration', description: 'Create a new user account' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async register(@Body() signUpDto: SignUpDto) {
    this.assertLegacyAuth();
    return this.authService.signUp(signUpDto);
  }

  @Post('signup')
  @ApiOperation({ summary: 'User registration (alias)', description: 'Create a new user account' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async signUp(@Body() signUpDto: SignUpDto) {
    this.assertLegacyAuth();
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'User login', description: 'Authenticate user with email and password' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() signInDto: SignInDto) {
    this.assertLegacyAuth();
    return this.authService.signIn(signInDto);
  }

  @Post('signin')
  @ApiOperation({ summary: 'User login (alias)', description: 'Authenticate user with email and password' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT token' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(@Body() signInDto: SignInDto) {
    this.assertLegacyAuth();
    return this.authService.signIn(signInDto);
  }
}
