import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { UsersModule } from '../users/users.module';
import { Loan } from '../models/loan.entity';
import { Reservation } from '../models/reservation.entity';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Loan, Reservation])],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
