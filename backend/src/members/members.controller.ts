import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole } from './member.interface';

@ApiTags('Members')
@Controller('members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Create new member', description: 'Create a new member (Admin only)' })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({ status: 201, description: 'Member created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto, createMemberDto.role || MemberRole.MEMBER);
  }

  @Get()
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Get all members', description: 'Retrieve all members (Admin/Librarian only)' })
  @ApiResponse({ status: 200, description: 'List of all members' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Librarian role required' })
  findAll() {
    return this.membersService.findAll();
  }

  @Get(':id')
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Get member by ID', description: 'Retrieve a single member by ID' })
  @ApiResponse({ status: 200, description: 'Member found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Update member', description: 'Update member details (Admin only)' })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({ status: 200, description: 'Member updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Delete member', description: 'Remove a member from the system (Admin only)' })
  @ApiResponse({ status: 200, description: 'Member deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Member not found' })
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}
