import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Group } from '../models/group.entity';
import { CreateGroupDto } from '../dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  findAll(): Promise<Group[]> {
    return this.groupRepository.find();
  }

  findOne(id: number): Promise<Group> {
    return this.groupRepository.findOne({ where: { id } });
  }

  create(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = this.groupRepository.create(createGroupDto);
    return this.groupRepository.save(group);
  }

  async remove(id: number): Promise<void> {
    await this.groupRepository.delete(id);
  }
}
