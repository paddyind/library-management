import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SqliteService } from '../config/sqlite.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import * as jwt from 'jsonwebtoken';
import { MemberRole } from '../members/member.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'sqlite' {
    return 'sqlite';
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, name, phone, dateOfBirth, address, preferences } = signUpDto;
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }
    if (this.sqliteService.findUserByEmail(email)) {
      throw new ConflictException('User with this email already exists');
    }
    const user = this.sqliteService.createUser({
      email, password, name: name || email.split('@')[0], role: MemberRole.MEMBER,
      phone: phone || '', dateOfBirth: dateOfBirth || '', address: address || '', preferences: preferences || '',
    });
    const result = { id: user.id, email: user.email, name: user.name, role: user.role as MemberRole };
    return { access_token: this.generateToken(result), user: result };
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not available');
    }
    const user = this.sqliteService.findUserByEmail(email);
    if (!user || !this.sqliteService.verifyPassword(password, user.password)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const role = this.normalizeRole(user.role);
    const result = { id: user.id, email: user.email, name: user.name, role };
    return { access_token: this.generateToken(result), user: { ...result, role: user.role } };
  }

  private normalizeRole(role?: string): MemberRole {
    if (role?.toLowerCase() === 'admin') return MemberRole.ADMIN;
    if (role?.toLowerCase() === 'librarian') return MemberRole.LIBRARIAN;
    return MemberRole.MEMBER;
  }

  private generateToken(user: { id: string; email: string; name: string; role: MemberRole }): string {
    return jwt.sign(
      { sub: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' },
    );
  }
}
