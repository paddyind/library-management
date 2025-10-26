import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../models/group.entity';
import { User } from '../models/user.entity';
import { CreateGroupDto, UpdateGroupDto } from '../dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Get all groups with user count
  async findAll(): Promise<any[]> {
    const groups = await this.groupRepository.find({
      relations: ['users'],
    });
    
    return groups.map(group => ({
      ...group,
      memberCount: group.users?.length || 0,
    }));
  }

  // Get a single group with members
  async findOne(id: number): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['users'],
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

  // Add a user to a group
  async addMember(groupId: number, userId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['users'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Check if user is already in the group
    if (group.users.some(u => u.id === userId)) {
      throw new ConflictException(`User is already a member of this group`);
    }

    group.users.push(user);
    return this.groupRepository.save(group);
  }

  // Remove a user from a group
  async removeMember(groupId: number, userId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['users'],
    });

    if (!group) {
      throw new NotFoundException(`Group with ID "${groupId}" not found`);
    }

    group.users = group.users.filter(u => u.id !== userId);
    return this.groupRepository.save(group);
  }

  // Get all members of a group
  async getMembers(groupId: number): Promise<User[]> {
    const group = await this.findOne(groupId);
    return group.users || [];
  }
}
