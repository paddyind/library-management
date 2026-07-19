import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Optional Admin API helper — assigns realm roles for clarity / onboarding.
 * Uses master admin credentials from env (local) or can be swapped to
 * client-credentials later for production.
 */
@Injectable()
export class KeycloakAdminService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private baseUrl = '';
  private realm = '';
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.baseUrl = (this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:3510').replace(/\/$/, '');
    this.realm = this.configService.get<string>('KEYCLOAK_REALM', 'library');
    const iam = (this.configService.get<string>('IAM_PROVIDER') || '').toLowerCase();
    this.enabled = iam === 'keycloak';
  }

  /** Ensure user has a direct realm role mapping (visible in Admin Console). */
  async ensureDirectRealmRole(userId: string, roleName: string): Promise<void> {
    if (!this.enabled || !userId || !roleName) return;

    try {
      const token = await this.getAdminToken();
      const roles = await this.fetchJson<any[]>(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        token,
      );
      if (roles.some((r) => r.name === roleName)) return;

      const role = await this.fetchJson<any>(
        `${this.baseUrl}/admin/realms/${this.realm}/roles/${encodeURIComponent(roleName)}`,
        token,
      );
      await this.fetchJson(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        token,
        {
          method: 'POST',
          body: JSON.stringify([role]),
        },
      );
      this.logger.debug(`Assigned direct realm role ${roleName} → ${userId}`);
    } catch (error: any) {
      // Non-fatal: JWT may still include member via default-roles composite
      this.logger.warn(`Could not ensure role ${roleName} for ${userId}: ${error.message}`);
    }
  }

  private async getAdminToken(): Promise<string> {
    const adminBase = this.baseUrl;
    const username = this.configService.get<string>('KEYCLOAK_ADMIN', 'admin');
    const password = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD', 'admin');

    const body = new URLSearchParams({
      client_id: 'admin-cli',
      username,
      password,
      grant_type: 'password',
    });

    const response = await fetch(`${adminBase}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(`admin token ${response.status}`);
    }
    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }

  private async fetchJson<T = unknown>(
    url: string,
    token: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${response.status} ${text.slice(0, 200)}`);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }
}
