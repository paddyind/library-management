import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from '../models/member.entity';
import { LoansService } from './loans.service';
import { CreateLoanDto } from '../dto/loan.dto';
import { GetMember } from '../auth/get-member.decorator';
import { Member } from '../models/member.entity';
import { BooksService } from '../books/books.service';

@Controller('loans')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly booksService: BooksService,
  ) {}

  @Post()
  @Roles(MemberRole.MEMBER)
  async create(@Body() createLoanDto: CreateLoanDto, @GetMember() member: Member) {
    const book = await this.booksService.findOne(createLoanDto.bookId);
    return this.loansService.create(createLoanDto, member, book);
  }
}
