import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { Member, MemberRole } from './member.interface';

@Injectable()
export class MembersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const storagePreference = this.configService.get<string>('AUTH_STORAGE', 'auto').toLowerCase();
    
    // Force SQLite if explicitly configured
    if (storagePreference === 'sqlite') {
      return 'sqlite';
    }
    
    // Force Supabase if explicitly configured (even if health check failed)
    if (storagePreference === 'supabase') {
      return 'supabase';
    }
    
    // Auto mode (default): Use Supabase ONLY if health check passed at startup
    // Once health check is done, stick with the decision for the session
    if (this.supabaseService.isReady()) {
      return 'supabase';
    }
    
    // Default to SQLite if Supabase health check failed or not configured
    return 'sqlite';
  }

  async create(createMemberDto: CreateMemberDto, role: MemberRole = MemberRole.MEMBER): Promise<Member> {
    const { email, password, name } = createMemberDto;

    const { data: existingMember, error: existingMemberError } = await this.supabaseService
      .getClient()
      .from('members')
      .select('email')
      .eq('email', email)
      .single();

    if (existingMember) {
      throw new ConflictException('A member with this email already exists');
    }

    const { data: authData, error: authError } = await this.supabaseService.getClient().auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('members')
      .insert([{ id: authData.user.id, name, email, role }])
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(query?: string): Promise<Member[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        let queryBuilder = this.supabaseService.getClient().from('members').select('*');

        if (query) {
          queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
        }

        const { data, error } = await queryBuilder;

        if (error) {
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.findAllFromSqlite(query);
        }

        return data || [];
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.findAllFromSqlite(query);
      }
    }

    return this.findAllFromSqlite(query);
  }

  private findAllFromSqlite(query?: string): Member[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      let users;

      if (query) {
        const searchTerm = `%${query}%`;
        users = db.prepare(`
          SELECT * FROM users 
          WHERE name LIKE ? OR email LIKE ?
          ORDER BY name
        `).all(searchTerm, searchTerm) as any[];
      } else {
        users = db.prepare('SELECT * FROM users ORDER BY name').all() as any[];
      }

      return users.map((user: any) => {
        // Normalize role to match MemberRole enum (case-insensitive)
        let normalizedRole = user.role?.toLowerCase();
        if (normalizedRole === 'admin') normalizedRole = MemberRole.ADMIN;
        else if (normalizedRole === 'librarian') normalizedRole = MemberRole.LIBRARIAN;
        else normalizedRole = MemberRole.MEMBER;
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizedRole,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        };
      });
    } catch (error: any) {
      console.warn('⚠️ SQLite query error:', error.message);
      return [];
    }
  }

  async findOne(id: string): Promise<Member> {
    const storage = this.getPreferredStorage();

    // Try Supabase first if preferred (credentials exist)
    if (storage === 'supabase') {
      try {
        // Attempt Supabase query even if service reports not ready
        const { data, error } = await this.supabaseService
          .getClient()
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.findOneFromSqlite(id);
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.findOneFromSqlite(id);
      }
    }

    // Use SQLite (either forced or as fallback)
    return this.findOneFromSqlite(id);
  }

  private findOneFromSqlite(id: string): Member {
    if (!this.sqliteService.isReady()) {
      // If SQLite is not available and this is an old token (e.g., user-1, user-2),
      // return a clear error message
      if (id.startsWith('user-')) {
        throw new NotFoundException(`Member with ID "${id}" not found. This may be from an old session. Please log out and log in again.`);
      }
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }

    const user = this.sqliteService.findUserById(id);
    if (!user) {
      // Handle old JWT tokens that reference non-existent users gracefully
      if (id.startsWith('user-')) {
        throw new NotFoundException(`Member with ID "${id}" not found. This may be from an old session. Please log out and log in again.`);
      }
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }

    // Remove password from response
    const { password, ...member } = user;
    // Normalize role to match MemberRole enum (case-insensitive)
    const roleLower = member.role?.toLowerCase();
    let normalizedRole: MemberRole;
    if (roleLower === 'admin') {
      normalizedRole = MemberRole.ADMIN;
    } else if (roleLower === 'librarian') {
      normalizedRole = MemberRole.LIBRARIAN;
    } else {
      normalizedRole = MemberRole.MEMBER;
    }
    return {
      ...member,
      role: normalizedRole,
    } as Member;
  }

  async findByEmail(email: string): Promise<Member | undefined> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('members')
      .select('*')
      .eq('email', email)
      .single();

    return data || undefined;
  }

  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('members')
      .update(updateMemberDto)
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('members').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
  }
}
