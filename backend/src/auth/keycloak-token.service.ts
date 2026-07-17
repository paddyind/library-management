import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import { MemberRole } from '../members/member.interface';

export interface KeycloakTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  realm_access?: { roles?: string[] };
}

@Injectable()
export class KeycloakTokenService implements OnModuleInit {
  private client: jwksRsa.JwksClient | null = null;
  private issuer = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const baseUrl = (this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:3510').replace(/\/$/, '');
    const realm = this.configService.get<string>('KEYCLOAK_REALM', 'library');
    this.issuer = `${baseUrl}/realms/${realm}`;
    this.client = jwksRsa({
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
      cache: true,
      rateLimit: true,
    });
  }

  async verifyToken(token: string): Promise<KeycloakTokenPayload> {
    if (!this.client) {
      throw new Error('Keycloak JWKS client not initialized');
    }

    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      throw new Error('Invalid token header');
    }

    const key = await this.client.getSigningKey(decoded.header.kid);
    const signingKey = key.getPublicKey();

    return jwt.verify(token, signingKey, {
      algorithms: ['RS256'],
      issuer: this.issuer,
    }) as KeycloakTokenPayload;
  }

  extractRole(payload: KeycloakTokenPayload): MemberRole {
    const roles = (payload.realm_access?.roles ?? []).map((r) => r.toLowerCase());
    if (roles.includes('admin')) {
      return MemberRole.ADMIN;
    }
    if (roles.includes('librarian')) {
      return MemberRole.LIBRARIAN;
    }
    return MemberRole.MEMBER;
  }

  extractDisplayName(payload: KeycloakTokenPayload): string {
    return (
      payload.name ||
      payload.preferred_username ||
      payload.email?.split('@')[0] ||
      'User'
    );
  }
}
