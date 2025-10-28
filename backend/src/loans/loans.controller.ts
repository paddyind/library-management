import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from '../dto/loan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MemberRole } from '../models/member.entity';
import { BooksService } from '../books/books.service';

@Controller('loans')
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly booksService: BooksService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(MemberRole.ADMIN)
  async create(@Body() createLoanDto: CreateLoanDto, @Req() req: any) {
    const book = await this.booksService.findOne(createLoanDto.bookId);
    return this.loansService.create(createLoanDto, req.user, book);
  }
}
