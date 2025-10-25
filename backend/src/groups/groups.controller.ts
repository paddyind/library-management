import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { Group } from '../models/group.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createGroupDto: CreateGroupDto): Promise<Group> {
    return this.groupsService.create(createGroupDto);
  }

  @Get()
  findAll(): Promise<Group[]> {
    return this.groupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Group> {
    return this.groupsService.findOne(+id);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string): Promise<void> {
    return this.groupsService.remove(+id);
  }
}
