import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto } from '../dto/create-group.dto';
import { Group } from './group.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from '../members/member.interface';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // Get all groups
  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  // Get a specific group
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Group> {
    return this.groupsService.findOne(id);
  }

  // Create a new group (Admin only)
  @Post()
  @Roles(MemberRole.ADMIN)
  create(@Body() createGroupDto: CreateGroupDto): Promise<Group> {
    return this.groupsService.create(createGroupDto);
  }

  // Update a group (Admin only)
  @Put(':id')
  @Roles(MemberRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ): Promise<Group> {
    return this.groupsService.update(id, updateGroupDto);
  }

  // Delete a group (Admin only)
  @Delete(':id')
  @Roles(MemberRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    await this.groupsService.remove(id);
    return { message: 'Group deleted successfully' };
  }

  // Get all members of a group
  @Get(':id/members')
  getMembers(@Param('id', ParseIntPipe) id: number) {
    return this.groupsService.getMembers(id);
  }

  // Add a member to a group (Admin only)
  @Post(':id/members')
  @Roles(MemberRole.ADMIN)
  addMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.groupsService.addMember(id, addMemberDto.memberId);
  }

  // Remove a member from a group (Admin only)
  @Delete(':id/members/:memberId')
  @Roles(MemberRole.ADMIN)
  async removeMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('memberId') memberId: string,
  ): Promise<{ message: string }> {
    await this.groupsService.removeMember(id, memberId);
    return { message: 'Member removed from group successfully' };
  }
}
