import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from '../dto/member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MemberRole } from './member.interface';
import type { Request } from 'express';

/**
 * Users Controller - Alias for Members Controller
 * Provides backward compatibility with /api/users endpoint
 */
@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Get all users', description: 'Retrieve all users (Admin/Librarian only)' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/Librarian role required' })
  findAll() {
    return this.membersService.findAll();
  }

  @Get(':id')
  @Roles(MemberRole.ADMIN, MemberRole.LIBRARIAN)
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a single user by ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Create new user', description: 'Create a new user (Admin only)' })
  @ApiBody({ type: CreateMemberDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto, createMemberDto.role || MemberRole.MEMBER);
  }

  @Patch(':id')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Update user', description: 'Update user details (Admin only)' })
  @ApiBody({ type: UpdateMemberDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN)
  @ApiOperation({ summary: 'Delete user', description: 'Remove a user from the system (Admin only)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }
}

