import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Loan } from '../models/loan.entity';
import { Reservation } from '../models/reservation.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Loan)
    private loansRepository: Repository<Loan>,
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
  ) {}

  async findAll(): Promise<any[]> {
    const loans = await this.loansRepository.find({ relations: ['book', 'borrower'] });
    const reservations = await this.reservationsRepository.find({ relations: ['book', 'member'] });

    const transactions = [
      ...loans.map(loan => ({ ...loan, member: loan.borrower, type: 'loan' })),
      ...reservations.map(reservation => ({ ...reservation, member: reservation.member, type: 'reservation' })),
    ];

    return transactions;
  }

  async findMemberTransactions(memberId: string): Promise<any[]> {
    const loans = await this.loansRepository.find({ where: { borrower: { id: memberId } }, relations: ['book', 'borrower'] });
    const reservations = await this.reservationsRepository.find({ where: { member: { id: memberId } }, relations: ['book', 'member'] });

    const transactions = [
      ...loans.map(loan => ({ ...loan, member: loan.borrower, type: 'loan' })),
      ...reservations.map(reservation => ({ ...reservation, member: reservation.member, type: 'reservation' })),
    ];

    return transactions;
  }
}
