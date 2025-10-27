import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../models/loan.entity';
import { CreateLoanDto } from '../dto/loan.dto';
import { Member } from '../models/member.entity';
import { Book } from '../models/book.entity';
import { subscriptionPlans } from '../config/subscription-plans';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
  ) {}

  async create(createLoanDto: CreateLoanDto, member: Member, book: Book): Promise<Loan> {
    const subscription = member.subscriptions[0];
    const plan = subscriptionPlans[subscription.tier];
    const activeLoans = await this.loansRepository.count({ where: { member: { id: member.id }, returnedAt: null } });

    if (activeLoans >= plan.lendingLimit) {
      throw new ConflictException('You have reached your borrowing limit.');
    }

    const loan = this.loansRepository.create({
      ...createLoanDto,
      member,
      book,
    });
    return this.loansRepository.save(loan);
  }
}
