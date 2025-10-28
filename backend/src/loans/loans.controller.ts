import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { LoansService } from './loans.service';
import { CreateLoanDto } from '../dto/loan.dto';
import { BooksService } from '../books/books.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@Controller('loans')
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly booksService: BooksService,
  ) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async create(@Body() createLoanDto: CreateLoanDto, @Req() req: any) {
    const book = await this.booksService.findOne(createLoanDto.bookId);
    return this.loansService.create(createLoanDto, req.user, book);
  }
}
