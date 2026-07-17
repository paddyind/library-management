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

/**
 * Browser tokens always carry iss = public Keycloak URL (localhost:3510).
 * Docker backends fetch JWKS via an internal URL (host.docker.internal:3510).
 * Those must not be conflated — see KEYCLOAK_ISSUER vs KEYCLOAK_URL.
 */
@Injectable()
export class KeycloakTokenService implements OnModuleInit {
  private client: jwksRsa.JwksClient | null = null;
  private issuer = '';
  private jwksUri = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const realm = this.configService.get<string>('KEYCLOAK_REALM', 'library');
    const jwksBase = (
      this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:3510'
    ).replace(/\/$/, '');

    // Prefer explicit public issuer; else KEYCLOAK_PUBLIC_URL; else same as JWKS base (local non-Docker).
    const explicitIssuer = this.configService.get<string>('KEYCLOAK_ISSUER')?.replace(/\/$/, '');
    const publicBase = (
      this.configService.get<string>('KEYCLOAK_PUBLIC_URL') || ''
    ).replace(/\/$/, '');

    this.issuer =
      explicitIssuer ||
      (publicBase ? `${publicBase}/realms/${realm}` : `${jwksBase}/realms/${realm}`);

    // JWKS can be fetched from internal URL even when issuer is public
    this.jwksUri = `${jwksBase}/realms/${realm}/protocol/openid-connect/certs`;
    this.client = jwksRsa({
      jwksUri: this.jwksUri,
      cache: true,
      rateLimit: true,
    });

    console.log(`[KeycloakTokenService] issuer=${this.issuer} jwks=${this.jwksUri}`);
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

    try {
      return jwt.verify(token, signingKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      }) as KeycloakTokenPayload;
    } catch (error: any) {
      const message = error?.message || 'Token verification failed';
      // Surface issuer mismatches clearly for ops
      if (message.toLowerCase().includes('issuer')) {
        throw new Error(
          `${message} (configured issuer: ${this.issuer}). ` +
            'Set KEYCLOAK_ISSUER / KEYCLOAK_PUBLIC_URL to the browser-facing Keycloak URL.',
        );
      }
      throw error;
    }
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
