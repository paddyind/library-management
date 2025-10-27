import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '../models/loan.entity';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { BooksModule } from '../books/books.module';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Loan]),
    BooksModule,
    MembersModule,
  ],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
