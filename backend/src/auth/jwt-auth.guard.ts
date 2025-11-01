import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
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
          role: member.role,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        };
      } catch (error) {
        // If user not found in database, fallback to JWT payload (for backward compatibility)
        console.warn(`⚠️ User ${userId} not found in database, using JWT payload`);
        request.user = {
          id: userId,
          email: payload.email,
          name: payload.name,
          role: payload.role || MemberRole.MEMBER,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
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
