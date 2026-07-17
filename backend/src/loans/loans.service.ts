import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CreateLoanDto } from '../dto/loan.dto';
import { Loan } from './loan.interface';
import { Member } from '../members/member.interface';
import { Book } from '../books/book.interface';
@Injectable()
export class LoansService {
  async create(_dto: CreateLoanDto, _member: Member, _book: Book): Promise<Loan> {
    throw new ServiceUnavailableException('Loans are unavailable while legacy storage is decommissioned.');
  }
}
