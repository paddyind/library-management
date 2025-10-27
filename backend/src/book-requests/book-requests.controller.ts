import { Controller, Post, Body, UseGuards, Request, Get, Param, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BookRequestsService } from './book-requests.service';
import { CreateBookRequestDto } from '../dto/create-book-request.dto';
import { UpdateBookRequestDto } from '../dto/update-book-request.dto';
import { MemberRole } from '../models/member.entity';

@Controller('book-requests')
export class BookRequestsController {
  constructor(private readonly bookRequestsService: BookRequestsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createBookRequestDto: CreateBookRequestDto, @Request() req) {
    return this.bookRequestsService.create(createBookRequestDto, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(MemberRole.ADMIN)
  @Get()
  findAll() {
    return this.bookRequestsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  findMine(@Request() req) {
    return this.bookRequestsService.findByMemberId(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(MemberRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBookRequestDto: UpdateBookRequestDto) {
    return this.bookRequestsService.update(id, updateBookRequestDto.status);
  }
}
