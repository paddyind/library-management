import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { usesFirebase } from '../config/storage.util';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { Member, MemberRole } from './member.interface';
import { KeycloakAdminService } from '../auth/keycloak-admin.service';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => KeycloakAdminService))
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  private usesFirebase(): boolean {
    return usesFirebase(this.configService, this.firestoreService);
  }

  private usesKeycloak(): boolean {
    return this.keycloakAdminService.isEnabled();
  }

  async create(dto: CreateMemberDto, role: MemberRole = MemberRole.MEMBER): Promise<Member> {
    const memberRole = this.role(role || dto.role || MemberRole.MEMBER);

    if (this.usesFirebase() && this.usesKeycloak()) {
      if (!dto.password) {
        throw new BadRequestException('Password is required to create a Keycloak user');
      }
      const existingProfile = await this.firestoreService
        .collection('profiles')
        .where('email', '==', dto.email)
        .limit(1)
        .get();
      if (!existingProfile.empty) {
        throw new ConflictException('A member with this email already exists');
      }

      let keycloakId: string | null = null;
      try {
        keycloakId = await this.keycloakAdminService.createUser({
          email: dto.email,
          name: dto.name,
          password: dto.password,
          role: memberRole,
          emailVerified: true,
        });
        const now = new Date();
        const profile = {
          email: dto.email,
          name: dto.name,
          role: memberRole,
          phone: (dto as any).phone ?? '',
          address: (dto as any).address ?? '',
          keycloakSub: keycloakId,
          createdAt: now,
          updatedAt: now,
        };
        await this.firestoreService.collection('profiles').doc(keycloakId).set(profile);
        return this.mapFirestore(keycloakId, profile);
      } catch (error: any) {
        if (keycloakId) {
          try {
            await this.keycloakAdminService.deleteUser(keycloakId);
          } catch (cleanupError: any) {
            this.logger.warn(`Failed to roll back Keycloak user ${keycloakId}: ${cleanupError.message}`);
          }
        }
        if (error?.message?.includes('already exists')) {
          throw new ConflictException(error.message);
        }
        throw new BadRequestException(error?.message || 'Failed to create user in Keycloak');
      }
    }

    if (this.usesFirebase()) {
      const existing = await this.firestoreService
        .collection('profiles')
        .where('email', '==', dto.email)
        .limit(1)
        .get();
      if (!existing.empty) throw new ConflictException('A member with this email already exists');
      const id = randomUUID();
      const now = new Date();
      const profile = {
        email: dto.email,
        name: dto.name,
        role: memberRole,
        phone: (dto as any).phone ?? '',
        address: (dto as any).address ?? '',
        createdAt: now,
        updatedAt: now,
      };
      await this.firestoreService.collection('profiles').doc(id).set(profile);
      return this.mapFirestore(id, profile);
    }

    if (this.sqliteService.findUserByEmail(dto.email)) {
      throw new ConflictException('A member with this email already exists');
    }
    const user = this.sqliteService.createUser({ ...dto, role: memberRole } as any);
    return this.mapSqlite(user);
  }

  async findAll(query?: string): Promise<Member[]> {
    if (this.usesFirebase()) {
      const snapshot = await this.firestoreService.collection('profiles').get();
      const q = query?.toLowerCase();
      return snapshot.docs
        .map((doc) => this.mapFirestore(doc.id, doc.data()))
        .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    if (!this.sqliteService.isReady()) return [];
    const db = this.sqliteService.getDatabase();
    const term = `%${query ?? ''}%`;
    const users = query
      ? db.prepare('SELECT * FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY name').all(term, term)
      : db.prepare('SELECT * FROM users ORDER BY name').all();
    return (users as any[]).map((user) => this.mapSqlite(user));
  }

  async findOne(id: string): Promise<Member> {
    if (this.usesFirebase()) {
      const doc = await this.firestoreService.collection('profiles').doc(id).get();
      if (!doc.exists) throw new NotFoundException(`Member with ID "${id}" not found`);
      return this.mapFirestore(doc.id, doc.data()!);
    }
    const user = this.sqliteService.isReady() ? this.sqliteService.findUserById(id) : undefined;
    if (!user) throw new NotFoundException(`Member with ID "${id}" not found`);
    return this.mapSqlite(user);
  }

  async findByEmail(email: string): Promise<Member | undefined> {
    if (this.usesFirebase()) {
      const snapshot = await this.firestoreService
        .collection('profiles')
        .where('email', '==', email)
        .limit(1)
        .get();
      return snapshot.empty ? undefined : this.mapFirestore(snapshot.docs[0].id, snapshot.docs[0].data());
    }
    const user = this.sqliteService.isReady() ? this.sqliteService.findUserByEmail(email) : undefined;
    return user ? this.mapSqlite(user) : undefined;
  }

  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
    if (this.usesFirebase()) {
      const ref = this.firestoreService.collection('profiles').doc(id);
      const existing = await ref.get();
      if (!existing.exists) throw new NotFoundException(`Member with ID "${id}" not found`);

      if (this.usesKeycloak()) {
        try {
          await this.keycloakAdminService.updateUser(id, {
            email: dto.email,
            name: dto.name,
            password: dto.password,
            role: dto.role,
          });
        } catch (error: any) {
          throw new BadRequestException(error?.message || 'Failed to update user in Keycloak');
        }
      }

      // Firestore rejects `undefined` field values — only write defined profile fields.
      const profileFields = Object.fromEntries(
        Object.entries(dto as Record<string, unknown>).filter(
          ([key, value]) => key !== 'password' && value !== undefined,
        ),
      );
      await ref.update({ ...profileFields, updatedAt: new Date() });
      return this.findOne(id);
    }

    if (!this.sqliteService.isReady()) throw new NotFoundException(`Member with ID "${id}" not found`);
    const db = this.sqliteService.getDatabase();
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(id)) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
    const fields = Object.entries(dto).filter(([, value]) => value !== undefined && value !== '');
    if (fields.length) {
      db.prepare(
        `UPDATE users SET ${fields.map(([key]) => `${key} = ?`).join(', ')}, updatedAt = ? WHERE id = ?`,
      ).run(...fields.map(([, value]) => value), new Date().toISOString(), id);
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (this.usesFirebase()) {
      const ref = this.firestoreService.collection('profiles').doc(id);
      if (!(await ref.get()).exists) {
        throw new NotFoundException(`Member with ID "${id}" not found`);
      }
      if (this.usesKeycloak()) {
        try {
          await this.keycloakAdminService.deleteUser(id);
        } catch (error: any) {
          // Profile may be orphaned if KC user already removed — continue cleanup
          this.logger.warn(`Keycloak delete for ${id}: ${error.message}`);
        }
      }
      await ref.delete();
      return;
    }
    const result = this.sqliteService.getDatabase().prepare('DELETE FROM users WHERE id = ?').run(id);
    if (!result.changes) throw new NotFoundException(`Member with ID "${id}" not found`);
  }

  async ensureKeycloakProfile(input: {
    id: string;
    email: string;
    name: string;
    role: MemberRole;
  }): Promise<Member> {
    if (!this.usesFirebase()) throw new NotFoundException(`Member with ID "${input.id}" not found`);
    const ref = this.firestoreService.collection('profiles').doc(input.id);
    const existing = await ref.get();
    const now = new Date();
    const patch: Record<string, unknown> = {
      email: input.email,
      name: input.name,
      role: input.role,
      keycloakSub: input.id,
      updatedAt: now,
    };
    if (!existing.exists) {
      patch.createdAt = now;
      patch.phone = '';
      patch.address = '';
    }
    await ref.set(patch, { merge: true });
    return this.findOne(input.id);
  }

  private mapSqlite(user: any): Member {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : new Date(),
      address: user.address || '',
      preferences: user.preferences,
      paymentMethod: user.paymentMethod,
      paymentDetails: user.paymentDetails,
      role: this.role(user.role),
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  private mapFirestore(id: string, data: any): Member {
    return {
      id,
      email: data.email ?? '',
      name: data.name ?? data.email ?? 'User',
      phone: data.phone ?? '',
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : new Date(),
      address: data.address ?? '',
      preferences: data.preferences,
      paymentMethod: data.paymentMethod,
      paymentDetails: data.paymentDetails,
      role: this.role(data.role),
      createdAt:
        data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt ?? Date.now()),
      updatedAt:
        data.updatedAt instanceof Date ? data.updatedAt : new Date(data.updatedAt ?? Date.now()),
    };
  }

  private role(value?: string): MemberRole {
    return value?.toLowerCase() === 'admin'
      ? MemberRole.ADMIN
      : value?.toLowerCase() === 'librarian'
        ? MemberRole.LIBRARIAN
        : MemberRole.MEMBER;
  }
}
