import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { Member, MemberRole } from '../members/member.interface';
import { MembersService } from '../members/members.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: Member;
    }
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly membersService: MembersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const payload = jwt.verify(token, secret) as any;
      
      // Fetch user from database to get accurate role
      const userId = payload.sub || payload.id;
      try {
        const member = await this.membersService.findOne(userId);
        
        // Attach user to request with accurate role from database
        request.user = {
          id: member.id,
          email: member.email,
          name: member.name,
          phone: member.phone || '',
          dateOfBirth: member.dateOfBirth || new Date(),
          address: member.address || '',
          preferences: member.preferences,
          paymentMethod: member.paymentMethod,
          paymentDetails: member.paymentDetails,
          role: member.role,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        };
      } catch (error: any) {
        // If user not found in database, try to create profile on-the-fly
        // This handles cases where user authenticated but profile wasn't created
        console.warn(`⚠️ User ${userId} not found in database, attempting to create profile...`);
        
        try {
          // Try to create a basic profile from JWT payload
          const email = payload.email || '';
          const name = payload.name || email.split('@')[0] || 'User';
          const role = payload.role || MemberRole.MEMBER;
          
          // Attempt to create user in SQLite (most reliable fallback)
          const sqliteService = (this.membersService as any).sqliteService;
          if (sqliteService && sqliteService.isReady()) {
            try {
              const db = (sqliteService as any).db;
              if (db) {
                const hashedPassword = bcrypt.hashSync('AUTO_CREATED', 10);
                const now = new Date().toISOString();
                
                const stmt = db.prepare(`
                  INSERT INTO users (id, email, password, name, role, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                
                stmt.run(userId, email, hashedPassword, name, role, now, now);
                console.log(`✅ Created profile for user ${userId} in SQLite`);
                
                // Retry fetching the user
                const member = await this.membersService.findOne(userId);
                request.user = {
                  id: member.id,
                  email: member.email,
                  name: member.name,
                  phone: member.phone || '',
                  dateOfBirth: member.dateOfBirth || new Date(),
                  address: member.address || '',
                  preferences: member.preferences,
                  paymentMethod: member.paymentMethod,
                  paymentDetails: member.paymentDetails,
                  role: member.role,
                  createdAt: member.createdAt,
                  updatedAt: member.updatedAt,
                };
              } else {
                throw new Error('SQLite database not available');
              }
            } catch (createError: any) {
              if (createError.message?.includes('already exists') || createError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                // User was created by another request, retry fetch
                const member = await this.membersService.findOne(userId);
                request.user = {
                  id: member.id,
                  email: member.email,
                  name: member.name,
                  phone: member.phone || '',
                  dateOfBirth: member.dateOfBirth || new Date(),
                  address: member.address || '',
                  preferences: member.preferences,
                  paymentMethod: member.paymentMethod,
                  paymentDetails: member.paymentDetails,
                  role: member.role,
                  createdAt: member.createdAt,
                  updatedAt: member.updatedAt,
                };
              } else {
                throw createError;
              }
            }
          } else {
            // No SQLite available - reject authentication with specific error code
            console.error(`❌ User ${userId} not found and cannot create profile - SQLite unavailable`);
            const error = new UnauthorizedException({
              message: 'Your account profile is missing. Please contact support or try logging in again.',
              code: 'PROFILE_MISSING',
              statusCode: 401,
            });
            (error as any).code = 'PROFILE_MISSING';
            throw error;
          }
        } catch (createError: any) {
          // If we can't create the profile, reject the request with specific error code
          console.error(`❌ Failed to create profile for user ${userId}:`, createError.message);
          const error = new UnauthorizedException({
            message: 'Your account profile is missing. Please contact support or try logging in again.',
            code: 'PROFILE_MISSING',
            statusCode: 401,
          });
          (error as any).code = 'PROFILE_MISSING';
          throw error;
        }
      }
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }
    
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
