import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateGroupDto, UpdateGroupDto } from '../dto/create-group.dto';
import { Group } from './group.interface';
import { Member } from '../members/member.interface';

@Injectable()
export class GroupsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<any[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*, members:group_members(count)');

    if (error) {
      throw new Error(error.message);
    }

    return data.map(group => ({
      ...group,
      memberCount: group.members[0]?.count || 0,
    }));
  }

  async findOne(id: number): Promise<Group> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .select('*, members:members(*)')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    return data;
  }

  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .insert([createGroupDto])
      .single();

    if (error) {
      if (error.code === '23505') { // unique_violation
        throw new ConflictException(`Group with name "${createGroupDto.name}" already exists`);
      }
      throw new Error(error.message);
    }

    return data;
  }

  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('groups')
      .update(updateGroupDto)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === '23505') { // unique_violation
        throw new ConflictException(`Group with name "${updateGroupDto.name}" already exists`);
      }
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }

    return data;
  }

  async remove(id: number): Promise<void> {
    const { error } = await this.supabaseService.getClient().from('groups').delete().eq('id', id);

    if (error) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }
  }

  async addMember(groupId: number, memberId: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .insert([{ group_id: groupId, member_id: memberId }]);

    if (error) {
        if (error.code === '23505') { // unique_violation
            throw new ConflictException(`Member is already a member of this group`);
        }
        throw new Error(error.message);
    }
  }

  async removeMember(groupId: number, memberId: string): Promise<void> {
    const { error } = await this.supabaseService
      .getClient()
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('member_id', memberId);

    if (error) {
        throw new Error(error.message);
    }
  }

  async getMembers(groupId: number): Promise<Member[]> {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('members')
      .select('*, group_members!inner(group_id)')
      .eq('group_members.group_id', groupId)

    if (error) {
        throw new Error(error.message)
    }

    return data;
  }
}
