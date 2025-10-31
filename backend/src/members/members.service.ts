import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { Member, MemberRole } from './member.interface';
import { mockUsers } from '../auth/auth.service';

@Injectable()
export class MembersService {
  constructor(private readonly supabaseService: SupabaseService) {}

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
    let queryBuilder = this.supabaseService.getClient().from('members').select('*');

    if (query) {
      queryBuilder = queryBuilder.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findOne(id: string): Promise<Member> {
    // Return mock data if Supabase is not configured
    if (!this.supabaseService.isReady()) {
      const user = mockUsers.find(u => u.id === id);
      if (!user) {
        throw new NotFoundException(`Member with ID "${id}" not found`);
      }
      // Remove password from response
      const { password, ...member } = user;
      return member as Member;
    }

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.warn('⚠️ Supabase query error, falling back to mock data:', error.message);
        const user = mockUsers.find(u => u.id === id);
        if (!user) {
          throw new NotFoundException(`Member with ID "${id}" not found`);
        }
        const { password, ...member } = user;
        return member as Member;
      }

      return data;
    } catch (error) {
      console.warn('⚠️ Supabase connection failed, falling back to mock data');
      const user = mockUsers.find(u => u.id === id);
      if (!user) {
        throw new NotFoundException(`Member with ID "${id}" not found`);
      }
      const { password, ...member } = user;
      return member as Member;
    }
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
