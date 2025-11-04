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
    const { email, password, name, phone, dateOfBirth, address, preferences, paymentMethod, paymentDetails } = createMemberDto;

    console.log(`🔍 [MembersService] create: Checking if user exists with email: ${email}`);
    const { data: existingMember, error: existingMemberError } = await this.supabaseService
      .getClient()
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle(); // Use maybeSingle() - returns null if no rows found

    if (existingMemberError && existingMemberError.code !== 'PGRST116') {
      console.error(`❌ [MembersService] create - Check existing error:`, existingMemberError.message, existingMemberError.code);
      // Don't throw - might be a schema issue, continue with creation
    }

    if (existingMember) {
      console.warn(`⚠️ [MembersService] create: User already exists with email: ${email}`);
      throw new ConflictException('A member with this email already exists');
    }

    console.log(`✅ [MembersService] create: No existing user found, proceeding with creation`);

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

    console.log(`🔍 [MembersService] create: Inserting user into users table: ${email}`);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .insert([{ id: authData.user.id, name, email, role, phone, dateOfBirth, address, preferences, paymentMethod, paymentDetails }])
      .select()
      .single();

    if (error) {
      console.error(`❌ [MembersService] create - Insert error:`, error.message, error.code, error.details);
      throw new Error(error.message);
    }

    console.log(`✅ [MembersService] create: User created successfully: ${email}`);
    return data;
  }

  async findAll(query?: string): Promise<Member[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        console.log(`🔍 [MembersService] findAll: Querying users table${query ? ` with filter: ${query}` : ''}`);
        let queryBuilder = this.supabaseService.getClient().from('users').select('*');

        if (query) {
          queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
        }

        const { data, error } = await queryBuilder;

        if (error) {
          console.error(`❌ [MembersService] findAll error:`, error.message, error.code, error);
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.findAllFromSqlite(query);
        }

        console.log(`✅ [MembersService] findAll: Found ${data?.length || 0} users`);
        return data || [];
      } catch (error: any) {
        console.error(`❌ [MembersService] findAll exception:`, error.message);
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
        console.log(`🔍 [MembersService] findOne: Querying users table for id: ${id}`);
        // Attempt Supabase query even if service reports not ready
        const { data, error } = await this.supabaseService
          .getClient()
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle(); // Use maybeSingle() - returns null if no rows found

        if (error) {
          console.error(`❌ [MembersService] findOne error:`, error.message, error.code, error);
          console.warn('⚠️ Supabase query error, falling back to SQLite:', error.message);
          return this.findOneFromSqlite(id);
        }

        if (!data) {
          console.warn(`⚠️ [MembersService] findOne: No user found with id: ${id}, falling back to SQLite`);
          return this.findOneFromSqlite(id);
        }

        console.log(`✅ [MembersService] findOne: User found in Supabase`);
        return data;
      } catch (error: any) {
        console.error(`❌ [MembersService] findOne exception:`, error.message);
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
    try {
      console.log(`🔍 [MembersService] findByEmail: Querying users table for email: ${email}`);
      const { data, error } = await this.supabaseService
        .getClient()
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no rows found instead of error

      if (error) {
        console.error(`❌ [MembersService] findByEmail error:`, error.message, error.code, error);
        return undefined;
      }

      console.log(`✅ [MembersService] findByEmail: Found user:`, data ? 'yes' : 'no');
      return data || undefined;
    } catch (err: any) {
      console.error(`❌ [MembersService] findByEmail exception:`, err.message);
      return undefined;
    }
  }

  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    console.log(`🔍 [MembersService] update: Updating user id: ${id}`);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .update(updateMemberDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`❌ [MembersService] update error:`, error.message, error.code, error);
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Member with ID "${id}" not found`);
      }
      throw new NotFoundException(`Member with ID "${id}" not found: ${error.message}`);
    }

    if (!data) {
      console.warn(`⚠️ [MembersService] update: No rows updated for id: ${id}`);
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }

    console.log(`✅ [MembersService] update: User updated successfully`);
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('users').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
  }
}
