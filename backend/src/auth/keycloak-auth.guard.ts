import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { MembersService } from '../members/members.service';
import { KeycloakTokenService } from './keycloak-token.service';
import { Member } from '../members/member.interface';

@Injectable()
export class KeycloakAuthGuard implements CanActivate {
  constructor(
    private readonly keycloakTokenService: KeycloakTokenService,
    private readonly membersService: MembersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.keycloakTokenService.verifyToken(token);
      const role = this.keycloakTokenService.extractRole(payload);
      const email = payload.email || payload.preferred_username || '';
      const name = this.keycloakTokenService.extractDisplayName(payload);

      // Keycloak realm roles are the source of truth — sync/create Firestore profile mirror.
      const member = await this.membersService.ensureKeycloakProfile({
        id: payload.sub,
        email,
        name,
        role,
      });

      request.user = { ...member, role, email: email || member.email, name: name || member.name };
      return true;
    } catch (error: any) {
      throw new UnauthorizedException(error.message || 'Invalid Keycloak token');
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
