import { IdMap, LegacyUser } from './backup-types';

export interface KeycloakMigratorOptions {
  baseUrl: string;
  realm: string;
  adminUser: string;
  adminPassword: string;
  dryRun: boolean;
}

export interface EnsureUserResult {
  sub: string;
  created: boolean;
}

interface KeycloakUser {
  id: string;
  email?: string;
  username?: string;
}

export class KeycloakMigrator {
  private token: string | null = null;

  constructor(private readonly options: KeycloakMigratorOptions) {}

  async ensureUser(user: LegacyUser): Promise<EnsureUserResult> {
    if (this.options.dryRun) {
      return { sub: `dry-run-${user.id}`, created: true };
    }

    await this.ensureToken();

    const existing = await this.findUserByEmail(user.email);
    if (existing) {
      await this.assignRealmRole(existing.id, user.role);
      return { sub: existing.id, created: false };
    }

    const createResponse = await fetch(
      `${this.options.baseUrl}/admin/realms/${this.options.realm}/users`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.email,
          email: user.email,
          emailVerified: false,
          enabled: true,
          firstName: user.name,
          requiredActions: ['UPDATE_PASSWORD'],
          attributes: {
            legacyUserId: [user.id],
          },
        }),
      },
    );

    if (createResponse.status !== 201) {
      const body = await createResponse.text();
      throw new Error(`Create user failed (${createResponse.status}): ${body}`);
    }

    const created = await this.findUserByEmail(user.email);
    if (!created) {
      throw new Error('User created but not found by email');
    }

    await this.assignRealmRole(created.id, user.role);
    return { sub: created.id, created: true };
  }

  private async findUserByEmail(email: string): Promise<KeycloakUser | null> {
    await this.ensureToken();

    const response = await fetch(
      `${this.options.baseUrl}/admin/realms/${this.options.realm}/users?email=${encodeURIComponent(email)}&exact=true`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
      },
    );

    if (!response.ok) {
      throw new Error(`User search failed (${response.status})`);
    }

    const users = (await response.json()) as KeycloakUser[];
    return users.length > 0 ? users[0] : null;
  }

  private async assignRealmRole(userId: string, roleName: string): Promise<void> {
    if (this.options.dryRun) {
      return;
    }

    await this.ensureToken();

    const roleResponse = await fetch(
      `${this.options.baseUrl}/admin/realms/${this.options.realm}/roles/${encodeURIComponent(roleName)}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );

    if (!roleResponse.ok) {
      console.warn(`⚠️  Role ${roleName} not found in realm — skipping role assignment`);
      return;
    }

    const role = await roleResponse.json();

    const assignResponse = await fetch(
      `${this.options.baseUrl}/admin/realms/${this.options.realm}/users/${userId}/role-mappings/realm`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([role]),
      },
    );

    if (!assignResponse.ok && assignResponse.status !== 409) {
      const body = await assignResponse.text();
      console.warn(`⚠️  Role assignment for ${roleName}: ${body}`);
    }
  }

  private async ensureToken(): Promise<void> {
    if (this.token) {
      return;
    }

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: this.options.adminUser,
      password: this.options.adminPassword,
    });

    const response = await fetch(
      `${this.options.baseUrl}/realms/master/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Keycloak admin login failed (${response.status}): ${text}`);
    }

    const json = (await response.json()) as { access_token: string };
    this.token = json.access_token;
  }
}

export type { IdMap };
