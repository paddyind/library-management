import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../models/group.entity';
import { Member } from '../models/member.entity';
import { CreateGroupDto, UpdateGroupDto } from '../dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
  ) {}

  // Get all groups with member count
  async findAll(): Promise<any[]> {
    const groups = await this.groupRepository.find({
      relations: ['members'],
    });
    
    return groups.map(group => ({
      ...group,
      memberCount: group.members?.length || 0,
    }));
  }

  // Get a single group with members
  async findOne(id: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['members'],
    });
    
    if (!group) {
      throw new NotFoundException(`Group with ID "${id}" not found`);
    }
    
    return group;
  }

  // Create a new group
  async create(createGroupDto: CreateGroupDto): Promise<Group> {
    // Check if group name already exists
    const existing = await this.groupRepository.findOne({
      where: { name: createGroupDto.name },
    });

    if (existing) {
      throw new ConflictException(`Group with name "${createGroupDto.name}" already exists`);
    }

    const group = this.groupRepository.create(createGroupDto);
    return this.groupRepository.save(group);
  }

  // Update a group
  async update(id: number, updateGroupDto: UpdateGroupDto): Promise<Group> {
    const group = await this.findOne(id);

    // Check if new name conflicts with existing group
    if (updateGroupDto.name && updateGroupDto.name !== group.name) {
      const existing = await this.groupRepository.findOne({
        where: { name: updateGroupDto.name },
      });

      if (existing) {
        throw new ConflictException(`Group with name "${updateGroupDto.name}" already exists`);
      }
    }

    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  // Delete a group
  async remove(id: number): Promise<void> {
    const group = await this.findOne(id);
    await this.groupRepository.remove(group);
  }

  // Add a member to a group
  async addMember(groupId: number, memberId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found`);
    }

    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID "${memberId}" not found`);
    }

    // Check if member is already in the group
    if (group.members.some(m => m.id === memberId)) {
      throw new ConflictException(`Member is already a member of this group`);
    }

    group.members.push(member);
    return this.groupRepository.save(group);
  }

  // Remove a member from a group
  async removeMember(groupId: number, memberId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found`);
    }

    group.members = group.members.filter(m => m.id !== memberId);
    return this.groupRepository.save(group);
  }

  // Get all members of a group
  async getMembers(groupId: number): Promise<Member[]> {
    const group = await this.findOne(groupId);
    return group.members || [];
  }
}
