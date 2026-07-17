import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { FirestoreService } from '../config/firestore.service';
import { getLegacyStorage, usesFirebase } from '../config/storage.util';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { Member, MemberRole } from './member.interface';

@Injectable()
export class MembersService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    return getLegacyStorage(this.configService, this.supabaseService);
  }

  private usesFirebase(): boolean {
    return usesFirebase(this.configService, this.firestoreService);
  }

  async create(createMemberDto: CreateMemberDto, role: MemberRole = MemberRole.MEMBER): Promise<Member> {
    const { email, password, name } = createMemberDto;
    // Optional fields that may not be in DTO
    const phone = (createMemberDto as any).phone;
    const dateOfBirth = (createMemberDto as any).dateOfBirth;
    const address = (createMemberDto as any).address;
    const preferences = (createMemberDto as any).preferences;
    const paymentMethod = (createMemberDto as any).paymentMethod;
    const paymentDetails = (createMemberDto as any).paymentDetails;

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
    if (this.usesFirebase()) {
      return this.findAllFromFirestore(query);
    }

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
        
        // Convert dateOfBirth from string to Date if present
        const dateOfBirth = user.dateOfBirth 
          ? (typeof user.dateOfBirth === 'string' ? new Date(user.dateOfBirth) : new Date(user.dateOfBirth))
          : new Date();
        
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          dateOfBirth,
          address: user.address || '',
          preferences: user.preferences,
          paymentMethod: user.paymentMethod,
          paymentDetails: user.paymentDetails,
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
    if (this.usesFirebase()) {
      return this.findOneFromFirestore(id);
    }

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
    // Convert dateOfBirth from string to Date if present
    const dateOfBirth = member.dateOfBirth 
      ? (typeof member.dateOfBirth === 'string' ? new Date(member.dateOfBirth) : new Date())
      : new Date();
    
    return {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      dateOfBirth,
      address: member.address || '',
      preferences: member.preferences,
      paymentMethod: (member as any).paymentMethod,
      paymentDetails: (member as any).paymentDetails,
      role: normalizedRole,
      createdAt: member.createdAt instanceof Date ? member.createdAt : new Date(member.createdAt),
      updatedAt: member.updatedAt instanceof Date ? member.updatedAt : new Date(member.updatedAt),
    };
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
    const storage = this.getPreferredStorage();
    
    if (storage === 'supabase') {
      try {
        // First, check if user exists in Supabase
        const { data: existingUser, error: checkError } = await this.supabaseService
          .getAdminClient()
          .from('users')
          .select('id')
          .eq('id', id)
          .maybeSingle();
        
        if (checkError || !existingUser) {
          // User doesn't exist in Supabase - try SQLite
          console.warn('⚠️ User not found in Supabase, trying SQLite...');
          return await this.updateInSqlite(id, updateMemberDto);
        }
        
        // User exists in Supabase - proceed with update
        // Use admin client to bypass RLS for updates
        const adminClient = this.supabaseService.getAdminClient();
        
        // Build update object with only name (which definitely exists)
        // Other fields (phone, dateOfBirth, address, preferences) may not exist in Supabase schema
        const updateData: any = {};
        if (updateMemberDto.name !== undefined) updateData.name = updateMemberDto.name;
        
        // Try to include optional fields, but we'll filter them out if they cause errors
        // Note: These columns may not exist in Supabase if migration 003_add_user_fields.sql wasn't applied
        const optionalFields = ['phone', 'dateOfBirth', 'address', 'preferences'];
        for (const field of optionalFields) {
          if (updateMemberDto[field] !== undefined) {
            updateData[field] = updateMemberDto[field];
          }
        }
        
        const { data, error } = await adminClient
          .from('users')
          .update(updateData)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) {
          // Check if it's a column doesn't exist error
          if (error.message?.includes("column") && (error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
            console.warn(`⚠️ Supabase column error: ${error.message}, filtering out missing columns and retrying...`);
            
            // Remove all optional fields that might not exist
            const filteredUpdate: any = {};
            if (updateMemberDto.name !== undefined) filteredUpdate.name = updateMemberDto.name;
            
            // Only include optional fields if they're explicitly requested and we can verify they exist
            // For now, we'll skip them to avoid errors
            
            const { data: retryData, error: retryError } = await adminClient
              .from('users')
              .update(filteredUpdate)
              .eq('id', id)
              .select()
              .maybeSingle();
            
            if (retryError) {
              console.error(`❌ Supabase update error after filtering: ${retryError.message}`);
              throw new Error(`Failed to update profile: ${retryError.message}`);
            }
            
            if (!retryData) {
              console.error(`❌ Supabase update: No rows updated for user ${id}`);
              throw new NotFoundException(`Member with ID "${id}" not found`);
            }
            
            console.log(`✅ [MembersService] update: User updated successfully in Supabase (only name field, optional fields skipped - columns may not exist in schema)`);
            
            // Return the updated data, but note that optional fields weren't updated
            // The frontend should be aware that these fields may not be persisted in Supabase
            return retryData;
          }
          
          // Other errors - throw instead of falling back to SQLite
          console.error(`❌ Supabase update error: ${error.message}`);
          throw new Error(`Failed to update profile in Supabase: ${error.message}`);
        }

        if (!data) {
          console.error(`❌ Supabase update: No rows updated for user ${id}`);
          throw new NotFoundException(`Member with ID "${id}" not found`);
        }

        console.log(`✅ [MembersService] update: User updated successfully in Supabase`);
        return data;
      } catch (error: any) {
        // Only fall back to SQLite if it's a connection error, not a schema/column error
        if (error instanceof NotFoundException || error.message?.includes('column') || error.message?.includes('schema')) {
          throw error; // Re-throw schema/column errors - don't fall back
        }
        
        console.warn('⚠️ Supabase connection error, falling back to SQLite:', error.message);
        return await this.updateInSqlite(id, updateMemberDto);
      }
    }
    
    return await this.updateInSqlite(id, updateMemberDto);
  }

  private async updateInSqlite(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    if (!this.sqliteService.isReady()) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }

    try {
      const db = this.sqliteService.getDatabase();
      
      // First ensure user exists - if not, try to sync from Supabase
      let user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
      
      if (!user) {
        // User doesn't exist in SQLite - check if they exist in Supabase
        console.warn(`⚠️ User ${id} not found in SQLite, checking Supabase...`);
        
        // Check if user exists in Supabase
        if (this.supabaseService.isReady()) {
          try {
            const { data: supabaseUser, error: supabaseError } = await this.supabaseService
              .getAdminClient()
              .from('users')
              .select('id, email, name, role, phone, dateOfBirth, address, preferences')
              .eq('id', id)
              .maybeSingle();
            
            if (supabaseUser && !supabaseError) {
              // User exists in Supabase but not SQLite - create them
              console.log(`🔄 Syncing user ${id} from Supabase to SQLite...`);
              const bcrypt = require('bcryptjs');
              const hashedPassword = bcrypt.hashSync('SYNCED_USER', 10);
              const now = new Date().toISOString();
              
              // Check which columns exist in the table
              const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
              const columnNames = tableInfo.map(col => col.name);
              
              const fields = ['id', 'email', 'password', 'name', 'role', 'createdAt', 'updatedAt'];
              const values = [supabaseUser.id, supabaseUser.email, hashedPassword, supabaseUser.name, supabaseUser.role, now, now];
              
              // Add optional fields if they exist in the table
              if (columnNames.includes('phone')) {
                fields.push('phone');
                values.push(supabaseUser.phone || '');
              }
              if (columnNames.includes('dateOfBirth')) {
                fields.push('dateOfBirth');
                values.push(supabaseUser.dateOfBirth ? new Date(supabaseUser.dateOfBirth).toISOString() : '');
              }
              if (columnNames.includes('address')) {
                fields.push('address');
                values.push(supabaseUser.address || '');
              }
              if (columnNames.includes('preferences')) {
                fields.push('preferences');
                values.push(supabaseUser.preferences || '');
              }
              
              const placeholders = fields.map(() => '?').join(', ');
              db.prepare(`INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`).run(...values);
              console.log(`✅ Created user ${id} in SQLite during update`);
              
              // Re-fetch the user
              user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
            } else {
              // User doesn't exist in either database
              throw new NotFoundException(`Member with ID "${id}" not found in SQLite or Supabase`);
            }
          } catch (syncError: any) {
            if (syncError instanceof NotFoundException) {
              throw syncError;
            }
            throw new NotFoundException(`Member with ID "${id}" not found and could not be synced: ${syncError.message}`);
          }
        } else {
          // Supabase not available and user doesn't exist in SQLite
          throw new NotFoundException(`Member with ID "${id}" not found in SQLite`);
        }
      }

      // Check which columns exist in the table
      const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
      const columnNames = tableInfo.map(col => col.name);

      // Build update query dynamically based on provided fields AND column existence
      const updates: string[] = [];
      const values: any[] = [];

      if (updateMemberDto.name !== undefined) {
        updates.push('name = ?');
        values.push(updateMemberDto.name);
      }
      if (updateMemberDto.phone !== undefined && columnNames.includes('phone')) {
        updates.push('phone = ?');
        values.push(updateMemberDto.phone);
      } else if (updateMemberDto.phone !== undefined && !columnNames.includes('phone')) {
        console.warn('⚠️ phone column does not exist in SQLite users table, skipping update');
      }
      if (updateMemberDto.dateOfBirth !== undefined && columnNames.includes('dateOfBirth')) {
        updates.push('dateOfBirth = ?');
        values.push(updateMemberDto.dateOfBirth);
      } else if (updateMemberDto.dateOfBirth !== undefined && !columnNames.includes('dateOfBirth')) {
        console.warn('⚠️ dateOfBirth column does not exist in SQLite users table, skipping update');
      }
      if (updateMemberDto.address !== undefined && columnNames.includes('address')) {
        updates.push('address = ?');
        values.push(updateMemberDto.address);
      } else if (updateMemberDto.address !== undefined && !columnNames.includes('address')) {
        console.warn('⚠️ address column does not exist in SQLite users table, skipping update');
      }
      if (updateMemberDto.preferences !== undefined && columnNames.includes('preferences')) {
        updates.push('preferences = ?');
        values.push(updateMemberDto.preferences);
      } else if (updateMemberDto.preferences !== undefined && !columnNames.includes('preferences')) {
        console.warn('⚠️ preferences column does not exist in SQLite users table, skipping update');
      }
      
      if (updates.length === 0) {
        // No updates to perform, return existing user
        return this.findOneFromSqlite(id);
      }

      // Always update updatedAt
      updates.push('updatedAt = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const updateQuery = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(updateQuery).run(...values);

      // Return updated user
      return this.findOneFromSqlite(id);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('⚠️ SQLite update error:', error.message);
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('users').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
  }

  async ensureKeycloakProfile(input: {
    id: string;
    email: string;
    name: string;
    role: MemberRole;
  }): Promise<Member> {
    if (!this.usesFirebase()) {
      throw new NotFoundException(`Member with ID "${input.id}" not found`);
    }

    const now = new Date();
    const profile = {
      email: input.email,
      name: input.name,
      role: input.role,
      keycloakSub: input.id,
      phone: '',
      address: '',
      createdAt: now,
      updatedAt: now,
    };

    await this.firestoreService.collection('profiles').doc(input.id).set(profile, { merge: true });
    return this.findOneFromFirestore(input.id);
  }

  private mapFirestoreProfile(id: string, data: Record<string, unknown>): Member {
    const roleRaw = String(data.role ?? 'member').toLowerCase();
    let role = MemberRole.MEMBER;
    if (roleRaw === 'admin') role = MemberRole.ADMIN;
    else if (roleRaw === 'librarian') role = MemberRole.LIBRARIAN;

    return {
      id,
      email: String(data.email ?? ''),
      name: String(data.name ?? data.email ?? 'User'),
      phone: String(data.phone ?? ''),
      dateOfBirth: data.dateOfBirth ? new Date(String(data.dateOfBirth)) : new Date(),
      address: String(data.address ?? ''),
      preferences: data.preferences ? String(data.preferences) : undefined,
      paymentMethod: data.paymentMethod ? String(data.paymentMethod) : undefined,
      paymentDetails: data.paymentDetails ? String(data.paymentDetails) : undefined,
      role,
      createdAt: data.createdAt instanceof Date ? data.createdAt : new Date(String(data.createdAt ?? Date.now())),
      updatedAt: data.updatedAt instanceof Date ? data.updatedAt : new Date(String(data.updatedAt ?? Date.now())),
    };
  }

  private async findOneFromFirestore(id: string): Promise<Member> {
    const doc = await this.firestoreService.collection('profiles').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Member with ID "${id}" not found`);
    }
    return this.mapFirestoreProfile(doc.id, doc.data() as Record<string, unknown>);
  }

  private async findAllFromFirestore(query?: string): Promise<Member[]> {
    const snapshot = await this.firestoreService.collection('profiles').get();
    let members = snapshot.docs.map((doc) =>
      this.mapFirestoreProfile(doc.id, doc.data() as Record<string, unknown>),
    );

    if (query) {
      const q = query.toLowerCase();
      members = members.filter(
        (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      );
    }

    return members.sort((a, b) => a.name.localeCompare(b.name));
  }
}
