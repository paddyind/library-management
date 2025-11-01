import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import * as jwt from 'jsonwebtoken';
import { MemberRole } from '../members/member.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const storagePreference = this.configService.get<string>('AUTH_STORAGE', 'auto').toLowerCase();
    
    // Force SQLite if explicitly configured
    if (storagePreference === 'sqlite') {
      return 'sqlite';
    }
    
    // Force Supabase if explicitly configured (even if health check failed)
    if (storagePreference === 'supabase') {
      return 'supabase';
    }
    
    // Auto mode (default): Use Supabase ONLY if health check passed at startup
    // Once health check is done, stick with the decision for the session
    if (this.supabaseService.isReady()) {
      return 'supabase';
    }
    
    // Default to SQLite if Supabase health check failed or not configured
    return 'sqlite';
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, name } = signUpDto;
    const storage = this.getPreferredStorage();
    
    // Try Supabase first if preferred (health check passed at startup)
    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService.getClient().auth.signUp({
          email,
          password,
        });

        if (error) {
          console.warn('⚠️ Supabase signup error, falling back to SQLite:', error.message);
          return this.sqliteSignUp(signUpDto);
        }

        console.log('✅ Supabase registration successful for:', email);
        
        // Generate JWT token from Supabase user
        const token = this.generateToken({
          id: data.user?.id || '',
          email: data.user?.email || email,
          name: name || email.split('@')[0],
          role: MemberRole.MEMBER,
        });

        return {
          access_token: token,
          user: {
            id: data.user?.id || '',
            email: data.user?.email || email,
            name: name || email.split('@')[0],
            role: MemberRole.MEMBER,
          },
        };
      } catch (error: any) {
        // Check for DNS/network errors and fallback immediately
        if (error.message === 'DNS_RESOLUTION_FAILED' || 
            error.code === 'EAI_AGAIN' || 
            error.code === 'ENOTFOUND' ||
            error.message?.includes('getaddrinfo')) {
          console.warn('⚠️ Supabase DNS/network error detected, immediately falling back to SQLite');
        } else {
          console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        }
        return this.sqliteSignUp(signUpDto);
      }
    }

    // Use SQLite registration (either forced or as fallback)
    return this.sqliteSignUp(signUpDto);
  }

  private sqliteSignUp(signUpDto: SignUpDto) {
    const { email, password, name } = signUpDto;
    
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    console.log('📝 SQLite registration:', email);
    
    try {
      // Check if user already exists
      const existingUser = this.sqliteService.findUserByEmail(email);
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create new user in SQLite
      const newUser = this.sqliteService.createUser({
        email,
        password,
        name: name || email.split('@')[0],
        role: MemberRole.MEMBER,
      });

      // Generate JWT token
      const token = this.generateToken({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role as MemberRole,
      });

      return {
        access_token: token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      };
    } catch (error: any) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const storage = this.getPreferredStorage();

    // Try Supabase first if preferred (health check passed at startup)
    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService.getClient().auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.warn('⚠️ Supabase auth error, falling back to SQLite:', error.message);
          return this.sqliteSignIn(email, password);
        }

        console.log('✅ Supabase authentication successful for:', email);
        
        // Generate JWT token from Supabase user
        const token = this.generateToken({
          id: data.user?.id || '',
          email: data.user?.email || email,
          name: data.user?.user_metadata?.name || email.split('@')[0],
          role: MemberRole.MEMBER,
        });

        return {
          access_token: token,
          user: {
            id: data.user?.id || '',
            email: data.user?.email || email,
            name: data.user?.user_metadata?.name || email.split('@')[0],
            role: MemberRole.MEMBER,
          },
        };
      } catch (error: any) {
        // Check for DNS/network errors and fallback immediately
        if (error.message === 'DNS_RESOLUTION_FAILED' || 
            error.code === 'EAI_AGAIN' || 
            error.code === 'ENOTFOUND' ||
            error.message?.includes('getaddrinfo')) {
          console.warn('⚠️ Supabase DNS/network error detected, immediately falling back to SQLite');
        } else {
          console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        }
        return this.sqliteSignIn(email, password);
      }
    }

    // Use SQLite authentication (either forced or as fallback)
    return this.sqliteSignIn(email, password);
  }

  private sqliteSignIn(email: string, password: string) {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }

    console.log('🔐 SQLite login attempt:', email);
    
    const user = this.sqliteService.findUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found:', email);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = this.sqliteService.verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Password mismatch for:', email);
      throw new UnauthorizedException('Invalid email or password');
    }

    console.log('✅ Login successful for:', email);

    // Normalize role to match MemberRole enum
    const roleLower = user.role?.toLowerCase();
    let normalizedRole: MemberRole;
    if (roleLower === 'admin') {
      normalizedRole = MemberRole.ADMIN;
    } else if (roleLower === 'librarian') {
      normalizedRole = MemberRole.LIBRARIAN;
    } else {
      normalizedRole = MemberRole.MEMBER;
    }

    // Generate JWT token
    const token = this.generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizedRole,
    });

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
