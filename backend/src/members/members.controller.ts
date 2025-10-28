import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from '../models/member.entity';

@ApiTags('Members')
@Controller('members')
@ApiBearerAuth()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Create new member', description: 'Create a new member (Admin only)' })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  create(@Body() createMemberDto: CreateMemberDto, @Body('role') role: MemberRole) {
    return this.membersService.create(createMemberDto, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all members', description: 'Retrieve all members (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of all members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  findAll() {
    return this.membersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get member by ID', description: 'Retrieve a single member by ID' })
  @ApiResponse({ status: 200, description: 'Member found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiOperation({ summary: 'Update member', description: 'Update member details' })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete member', description: 'Remove a member from the system' })
  @ApiResponse({ status: 200, description: 'Member deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
