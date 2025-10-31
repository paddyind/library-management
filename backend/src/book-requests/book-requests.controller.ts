import { Controller, Post, Body, UseGuards, Get, Param, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from '../members/member.interface';
import type { Member } from '../members/member.interface';
import { BookRequestsService } from './book-requests.service';
import { CreateBookRequestDto } from '../dto/book-request.dto';
import { GetMember } from '../auth/get-member.decorator';

@Controller('book-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookRequestsController {
  constructor(private readonly bookRequestsService: BookRequestsService) {}

  @Post()
  @Roles(MemberRole.MEMBER)
  create(@Body() createBookRequestDto: CreateBookRequestDto, @GetMember() member: Member) {
    return this.bookRequestsService.create(createBookRequestDto, member);
  }

  @Get()
  @Roles(MemberRole.ADMIN)
  findAll() {
    return this.bookRequestsService.findAll();
  }

  @Get('member')
  @Roles(MemberRole.MEMBER)
  findByMember(@GetMember() member: Member) {
    return this.bookRequestsService.findByMember(member.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookRequestsService.findOne(id);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.bookRequestsService.remove(id);
  }
}
