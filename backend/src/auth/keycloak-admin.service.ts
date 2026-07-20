import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const APP_ROLES = ['admin', 'librarian', 'member'] as const;
export type AppRealmRole = (typeof APP_ROLES)[number];

/**
 * Keycloak Admin API helper for the app realm.
 * Used to keep Settings → Users in sync with realm users/roles.
 */
@Injectable()
export class KeycloakAdminService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private baseUrl = '';
  private realm = '';
  private enabled = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.baseUrl = (this.configService.get<string>('KEYCLOAK_URL') || 'http://localhost:3510').replace(
      /\/$/,
      '',
    );
    this.realm = this.configService.get<string>('KEYCLOAK_REALM', 'library');
    const iam = (this.configService.get<string>('IAM_PROVIDER') || '').toLowerCase();
    this.enabled = iam === 'keycloak';
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Ensure user has a direct realm role mapping (visible in Admin Console). */
  async ensureDirectRealmRole(userId: string, roleName: string): Promise<void> {
    if (!this.enabled || !userId || !roleName) return;

    try {
      const token = await this.getAdminToken();
      await this.assignRolesIfMissing(token, userId, [roleName]);
    } catch (error: any) {
      this.logger.warn(`Could not ensure role ${roleName} for ${userId}: ${error.message}`);
    }
  }

  /**
   * Set the primary app role. Always keeps `member`; adds `admin` or `librarian` when elevated.
   * Removes other app roles so JWT matches Settings.
   */
  async setAppRole(userId: string, role: AppRealmRole | string): Promise<void> {
    if (!this.enabled || !userId) return;

    const primary = this.normalizeRole(role);
    const desired = new Set<string>(['member']);
    if (primary === 'admin' || primary === 'librarian') {
      desired.add(primary);
    }

    const token = await this.getAdminToken();
    const current = await this.fetchJson<any[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      token,
    );
    const currentApp = current.filter((r) => APP_ROLES.includes(r.name));
    const toRemove = currentApp.filter((r) => !desired.has(r.name));
    const missing = [...desired].filter((name) => !currentApp.some((r) => r.name === name));

    if (toRemove.length) {
      await this.fetchJson(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
        token,
        { method: 'DELETE', body: JSON.stringify(toRemove) },
      );
    }
    if (missing.length) {
      await this.assignRolesIfMissing(token, userId, missing);
    }
  }

  async createUser(input: {
    email: string;
    name: string;
    password: string;
    role?: string;
    emailVerified?: boolean;
  }): Promise<string> {
    if (!this.enabled) {
      throw new Error('Keycloak Admin is disabled (IAM_PROVIDER != keycloak)');
    }

    const token = await this.getAdminToken();
    const existing = await this.findUserIdByEmail(input.email, token);
    if (existing) {
      throw new Error(`Keycloak user already exists for ${input.email}`);
    }

    const { firstName, lastName } = this.splitName(input.name);
    const response = await fetch(`${this.baseUrl}/admin/realms/${this.realm}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: input.email,
        email: input.email,
        enabled: true,
        emailVerified: input.emailVerified !== false,
        firstName,
        lastName,
        credentials: [
          {
            type: 'password',
            value: input.password,
            temporary: false,
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`create user ${response.status}: ${text.slice(0, 300)}`);
    }

    const location = response.headers.get('Location') || '';
    let userId = location.split('/').filter(Boolean).pop() || '';
    if (!userId) {
      userId = (await this.findUserIdByEmail(input.email, token)) || '';
    }
    if (!userId) {
      throw new Error('Keycloak user created but id could not be resolved');
    }

    await this.setAppRole(userId, input.role || 'member');
    return userId;
  }

  async updateUser(
    userId: string,
    input: { email?: string; name?: string; password?: string; role?: string },
  ): Promise<void> {
    if (!this.enabled || !userId) return;

    const token = await this.getAdminToken();
    const patch: Record<string, unknown> = {};
    if (input.email) {
      patch.email = input.email;
      patch.username = input.email;
    }
    if (input.name) {
      const { firstName, lastName } = this.splitName(input.name);
      patch.firstName = firstName;
      patch.lastName = lastName;
    }
    if (Object.keys(patch).length) {
      await this.fetchJson(`${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`, token, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
    }

    if (input.password) {
      await this.fetchJson(
        `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/reset-password`,
        token,
        {
          method: 'PUT',
          body: JSON.stringify({
            type: 'password',
            value: input.password,
            temporary: false,
          }),
        },
      );
    }

    if (input.role) {
      await this.setAppRole(userId, input.role);
    }
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.enabled || !userId) return;
    const token = await this.getAdminToken();
    await this.fetchJson(`${this.baseUrl}/admin/realms/${this.realm}/users/${userId}`, token, {
      method: 'DELETE',
    });
  }

  async findUserIdByEmail(email: string, token?: string): Promise<string | null> {
    if (!this.enabled || !email) return null;
    const adminToken = token || (await this.getAdminToken());
    const users = await this.fetchJson<any[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users?email=${encodeURIComponent(email)}&exact=true`,
      adminToken,
    );
    return users?.[0]?.id || null;
  }

  private async assignRolesIfMissing(token: string, userId: string, roleNames: string[]): Promise<void> {
    const current = await this.fetchJson<any[]>(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      token,
    );
    const toAssign: any[] = [];
    for (const roleName of roleNames) {
      if (current.some((r) => r.name === roleName)) continue;
      const role = await this.fetchJson<any>(
        `${this.baseUrl}/admin/realms/${this.realm}/roles/${encodeURIComponent(roleName)}`,
        token,
      );
      toAssign.push(role);
    }
    if (!toAssign.length) return;
    await this.fetchJson(
      `${this.baseUrl}/admin/realms/${this.realm}/users/${userId}/role-mappings/realm`,
      token,
      { method: 'POST', body: JSON.stringify(toAssign) },
    );
    this.logger.debug(`Assigned realm roles [${toAssign.map((r) => r.name).join(', ')}] → ${userId}`);
  }

  private normalizeRole(role?: string): AppRealmRole {
    const value = String(role || 'member').toLowerCase();
    if (value === 'admin') return 'admin';
    if (value === 'librarian') return 'librarian';
    return 'member';
  }

  private splitName(name: string): { firstName: string; lastName: string } {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  private async getAdminToken(): Promise<string> {
    const username = this.configService.get<string>('KEYCLOAK_ADMIN', 'admin');
    const password = this.configService.get<string>('KEYCLOAK_ADMIN_PASSWORD', 'admin');

    const body = new URLSearchParams({
      client_id: 'admin-cli',
      username,
      password,
      grant_type: 'password',
    });

    const response = await fetch(`${this.baseUrl}/realms/master/protocol/openid-connect/token`, {
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
