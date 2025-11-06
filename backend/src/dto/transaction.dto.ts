import { IsNotEmpty, IsString, IsEnum } from 'class-validator';
import { TransactionType } from '../transactions/transaction.interface';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  bookId: string;

  @IsNotEmpty()
  @IsEnum(TransactionType)
  type: TransactionType;
}
