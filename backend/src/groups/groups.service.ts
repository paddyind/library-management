import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../config/supabase.service';
import { SqliteService } from '../config/sqlite.service';
import { CreateGroupDto, UpdateGroupDto } from '../dto/create-group.dto';
import { Group } from './group.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class GroupsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sqliteService: SqliteService,
    private readonly configService: ConfigService,
  ) {}

  private getPreferredStorage(): 'supabase' | 'sqlite' {
    const authStorage = this.configService.get<string>('AUTH_STORAGE', 'auto');
    
    if (authStorage === 'sqlite') {
      return 'sqlite';
    }
    
    if (authStorage === 'supabase') {
      return 'supabase';
    }

    // Auto-detect: prefer Supabase if configured and available
    try {
      const supabaseClient = this.supabaseService.getClient();
      if (supabaseClient) {
        return 'supabase';
      }
    } catch (error) {
      // Supabase not available, fallback to SQLite
    }

    // Default to SQLite if available
    return this.sqliteService.isReady() ? 'sqlite' : 'supabase';
  }

  async findAll(): Promise<any[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('groups')
          .select('*, members:group_members(count)');

        if (error) {
          // Only log if it's not a timeout (expected when Supabase is unavailable)
          if (!error.message?.includes('TIMEOUT')) {
            console.warn('⚠️ Supabase groups query error, falling back to SQLite:', error.message);
          }
          return this.sqliteFindAll();
        }

        return data.map(group => ({
          ...group,
          memberCount: group.members?.[0]?.count || 0,
        }));
      } catch (error: any) {
        // Only log if it's not a timeout (expected when Supabase is unavailable)
        if (!error.message?.includes('TIMEOUT') && error.code !== 'ETIMEDOUT') {
          console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        }
        return this.sqliteFindAll();
      }
    }

    return this.sqliteFindAll();
  }

  private sqliteFindAll(): any[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    try {
      const db = this.sqliteService.getDatabase();
      const groups = db.prepare('SELECT * FROM groups ORDER BY name').all() as any[];
      
      // Get member count for each group
      return groups.map(group => {
        try {
          const memberCountResult = db.prepare('SELECT COUNT(*) as count FROM group_members WHERE group_id = ?')
            .get(group.id) as any;
          const memberCount = memberCountResult?.count || 0;
          
          // Parse permissions if it's a JSON string
          let permissions = [];
          try {
            if (typeof group.permissions === 'string' && group.permissions) {
              permissions = JSON.parse(group.permissions);
            } else if (Array.isArray(group.permissions)) {
              permissions = group.permissions;
            }
          } catch (e) {
            permissions = [];
          }
          
          return {
            ...group,
            permissions: permissions,
            memberCount: memberCount,
          };
        } catch (error: any) {
          console.warn(`⚠️ Error processing group ${group.id}:`, error.message);
          return {
            ...group,
            permissions: [],
            memberCount: 0,
          };
        }
      });
    } catch (error: any) {
      console.warn('⚠️ SQLite groups query error:', error.message);
      return [];
    }
  }

  async findOne(id: number): Promise<Group> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('groups')
          .select('*, members:members(*)')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            throw new NotFoundException(`Group with ID "${id}" not found`);
          }
          console.warn('⚠️ Supabase group query error, falling back to SQLite:', error.message);
          return this.sqliteFindOne(id);
        }

        return data;
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteFindOne(id);
      }
    }

    return this.sqliteFindOne(id);
  }

  private sqliteFindOne(id: number): Group {
    if (!this.sqliteService.isReady()) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    const db = this.sqliteService.getDatabase();
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as any;
    
    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    const members = db.prepare('SELECT * FROM group_members WHERE group_id = ?').all(id) as any[];
    return {
      ...group,
      members: members,
    };
  }

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('groups')
          .insert([createGroupDto])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // unique_violation
            throw new ConflictException(`Group with name "${createGroupDto.name}" already exists`);
          }
          console.warn('⚠️ Supabase group create error, falling back to SQLite:', error.message);
          return this.sqliteCreate(createGroupDto);
        }

        return data;
      } catch (error: any) {
        if (error instanceof ConflictException) {
          throw error;
        }
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteCreate(createGroupDto);
      }
    }

    return this.sqliteCreate(createGroupDto);
  }

  private sqliteCreate(createGroupDto: CreateGroupDto): Group {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not initialized');
    }

    const db = this.sqliteService.getDatabase();
    const id = Date.now(); // Simple ID generation for SQLite
    
    try {
      db.prepare(`
        INSERT INTO groups (id, name, description, permissions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        createGroupDto.name,
        createGroupDto.description || '',
        JSON.stringify(createGroupDto.permissions || []),
        new Date().toISOString(),
        new Date().toISOString(),
      );

      return this.sqliteFindOne(id);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new ConflictException(`Group with name "${createGroupDto.name}" already exists`);
      }
      throw error;
    }
  }

  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('groups')
          .update(updateGroupDto)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // unique_violation
            throw new ConflictException(`Group with name "${updateGroupDto.name}" already exists`);
          }
          if (error.code === 'PGRST116') {
            throw new NotFoundException(`Group with ID "${id}" not found`);
          }
          console.warn('⚠️ Supabase group update error, falling back to SQLite:', error.message);
          return this.sqliteUpdate(id, updateGroupDto);
        }

        return data;
      } catch (error: any) {
        if (error instanceof NotFoundException || error instanceof ConflictException) {
          throw error;
        }
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteUpdate(id, updateGroupDto);
      }
    }

    return this.sqliteUpdate(id, updateGroupDto);
  }

  private sqliteUpdate(id: number, updateGroupDto: UpdateGroupDto): Group {
    if (!this.sqliteService.isReady()) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    const db = this.sqliteService.getDatabase();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (updateGroupDto.name !== undefined) {
        updates.push('name = ?');
        values.push(updateGroupDto.name);
      }
      if (updateGroupDto.description !== undefined) {
        updates.push('description = ?');
        values.push(updateGroupDto.description);
      }
      if (updateGroupDto.permissions !== undefined) {
        updates.push('permissions = ?');
        values.push(JSON.stringify(updateGroupDto.permissions));
      }
      updates.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      db.prepare(`UPDATE groups SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      return this.sqliteFindOne(id);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new ConflictException(`Group with name "${updateGroupDto.name}" already exists`);
      }
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }
  }

  async remove(id: number): Promise<void> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { error } = await this.supabaseService.getClient().from('groups').delete().eq('id', id);

        if (error) {
          if (error.code === 'PGRST116') {
            throw new NotFoundException(`Group with ID "${id}" not found`);
          }
          console.warn('⚠️ Supabase group delete error, falling back to SQLite:', error.message);
          return this.sqliteRemove(id);
        }
      } catch (error: any) {
        if (error instanceof NotFoundException) {
          throw error;
        }
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteRemove(id);
      }
    } else {
      return this.sqliteRemove(id);
    }
  }

  private sqliteRemove(id: number): void {
    if (!this.sqliteService.isReady()) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    const db = this.sqliteService.getDatabase();
    const result = db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    
    if (result.changes === 0) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }
  }

  async addMember(groupId: number, memberId: string): Promise<void> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { error } = await this.supabaseService
          .getClient()
          .from('group_members')
          .insert([{ group_id: groupId, member_id: memberId }]);

        if (error) {
          if (error.code === '23505') { // unique_violation
            throw new ConflictException(`Member is already a member of this group`);
          }
          console.warn('⚠️ Supabase add member error, falling back to SQLite:', error.message);
          return this.sqliteAddMember(groupId, memberId);
        }
      } catch (error: any) {
        if (error instanceof ConflictException) {
          throw error;
        }
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteAddMember(groupId, memberId);
      }
    } else {
      return this.sqliteAddMember(groupId, memberId);
    }
  }

  private sqliteAddMember(groupId: number, memberId: string): void {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not initialized');
    }

    const db = this.sqliteService.getDatabase();
    
    try {
      db.prepare('INSERT INTO group_members (group_id, member_id) VALUES (?, ?)')
        .run(groupId, memberId);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint failed')) {
        throw new ConflictException(`Member is already a member of this group`);
      }
      throw error;
    }
  }

  async removeMember(groupId: number, memberId: string): Promise<void> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { error } = await this.supabaseService
          .getClient()
          .from('group_members')
          .delete()
          .eq('group_id', groupId)
          .eq('member_id', memberId);

        if (error) {
          console.warn('⚠️ Supabase remove member error, falling back to SQLite:', error.message);
          return this.sqliteRemoveMember(groupId, memberId);
        }
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteRemoveMember(groupId, memberId);
      }
    } else {
      return this.sqliteRemoveMember(groupId, memberId);
    }
  }

  private sqliteRemoveMember(groupId: number, memberId: string): void {
    if (!this.sqliteService.isReady()) {
      throw new Error('SQLite database is not initialized');
    }

    const db = this.sqliteService.getDatabase();
    db.prepare('DELETE FROM group_members WHERE group_id = ? AND member_id = ?')
      .run(groupId, memberId);
  }

  async getMembers(groupId: number): Promise<Member[]> {
    const storage = this.getPreferredStorage();

    if (storage === 'supabase') {
      try {
        const { data, error } = await this.supabaseService
          .getClient()
          .from('members')
          .select('*, group_members!inner(group_id)')
          .eq('group_members.group_id', groupId);

        if (error) {
          console.warn('⚠️ Supabase get members error, falling back to SQLite:', error.message);
          return this.sqliteGetMembers(groupId);
        }

        return data;
      } catch (error: any) {
        console.warn('⚠️ Supabase connection failed, falling back to SQLite:', error.message);
        return this.sqliteGetMembers(groupId);
      }
    }

    return this.sqliteGetMembers(groupId);
  }

  private sqliteGetMembers(groupId: number): Member[] {
    if (!this.sqliteService.isReady()) {
      return [];
    }

    const db = this.sqliteService.getDatabase();
    const members = db.prepare(`
      SELECT u.* FROM users u
      INNER JOIN group_members gm ON u.id = gm.member_id
      WHERE gm.group_id = ?
    `).all(groupId) as any[];

    return members.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    }));
  }
}
