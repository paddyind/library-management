import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import * as jwt from 'jsonwebtoken';
import { MemberRole } from '../members/member.interface';

// In-memory user store for demo purposes
// TODO: Replace with actual database storage
export const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@library.com',
    password: 'admin123', // In production, this would be hashed
    name: 'Admin User',
    role: MemberRole.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'user-2',
    email: 'user@library.com',
    password: 'user123',
    name: 'Regular User',
    role: MemberRole.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

@Injectable()
export class AuthService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password } = signUpDto;
    
    // Check if Supabase is configured and try to use it
    if (this.supabaseService.isReady()) {
      try {
        const { data, error } = await this.supabaseService.getClient().auth.signUp({
          email,
          password,
        });

        if (error) {
          console.warn('⚠️ Supabase signup error, falling back to mock registration:', error.message);
          return this.mockSignUp(signUpDto);
        }

        console.log('✅ Supabase registration successful for:', email);
        return data;
      } catch (error) {
        console.warn('⚠️ Supabase connection failed, falling back to mock registration:', error.message);
        return this.mockSignUp(signUpDto);
      }
    }

    // Use mock registration if Supabase not configured
    return this.mockSignUp(signUpDto);
  }

  private mockSignUp(signUpDto: SignUpDto) {
    const { email, password } = signUpDto;
    
    console.log('📝 Mock registration:', email);
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      password, // In production, hash this!
      name: signUpDto.name || email.split('@')[0],
      role: MemberRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUsers.push(newUser);

    // Generate JWT token
    const token = this.generateToken(newUser);

    return {
      access_token: token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    };
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;

    // Check if Supabase is configured and try to use it
    if (this.supabaseService.isReady()) {
      try {
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn('⚠️ Supabase auth error, falling back to mock authentication:', error.message);
          return this.mockSignIn(email, password);
        }

        console.log('✅ Supabase authentication successful for:', email);
        return data;
      } catch (error) {
        console.warn('⚠️ Supabase connection failed, falling back to mock authentication:', error.message);
        return this.mockSignIn(email, password);
      }
    }

    // Use mock authentication if Supabase not configured
    return this.mockSignIn(email, password);
  }

  private mockSignIn(email: string, password: string) {
    console.log('🔐 Mock login attempt:', email);
    console.log('🔐 Password received:', password);
    console.log('🔐 Available mock users:', mockUsers.map(u => ({ email: u.email, password: u.password })));
    
    const user = mockUsers.find(u => u.email === email && u.password === password);
    
    if (!user) {
      console.log('❌ User not found or password mismatch');
      throw new UnauthorizedException('Invalid email or password');
    }
    console.log('✅ Login successful for:', email);

    // Generate JWT token
    const token = this.generateToken(user);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private generateToken(user: any): string {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    
    return jwt.sign(payload, secret, { expiresIn: '7d' });
  }
}
