import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateTransactionDto } from '../dto/transaction.dto';
import { Transaction, TransactionType } from './transaction.interface';

@Injectable()
export class TransactionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createTransactionDto: CreateTransactionDto, memberId: string): Promise<Transaction> {
    const { bookId, type } = createTransactionDto;
    const { data, error } = await this.supabaseService
      .getClient()
      .from('transactions')
      .insert([{ bookId, memberId, type }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async findAll(): Promise<any[]> {
    // If Supabase health check failed at startup, return empty array (decision already made)
    if (!this.supabaseService.isReady()) {
      return [];
    }

    try {
      const { data: loans, error: loansError } = await this.supabaseService
        .getClient()
        .from('loans')
        .select('*, member:members(*), book:books(*)');

      if (loansError) {
        console.warn('⚠️ Supabase loans query error:', loansError.message);
        return [];
      }

      const { data: reservations, error: reservationsError } = await this.supabaseService
        .getClient()
        .from('reservations')
        .select('*, member:members(*), book:books(*)');

      if (reservationsError) {
        console.warn('⚠️ Supabase reservations query error:', reservationsError.message);
        return loans?.map(loan => ({ ...loan, type: 'loan' })) || [];
      }

      const transactions = [
        ...(loans?.map(loan => ({ ...loan, type: 'loan' })) || []),
        ...(reservations?.map(reservation => ({ ...reservation, type: 'reservation' })) || []),
      ];

      return transactions;
    } catch (error: any) {
      // Handle timeout and other errors gracefully
      if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
        console.warn('⚠️ Supabase query timeout, returning empty transactions list');
      } else {
        console.warn('⚠️ Supabase connection error, returning empty transactions list:', error.message);
      }
      return [];
    }
  }

  async findMemberTransactions(memberId: string): Promise<any[]> {
    // If Supabase health check failed at startup, return empty array (decision already made)
    if (!this.supabaseService.isReady()) {
      return [];
    }

    try {
      const { data: loans, error: loansError } = await this.supabaseService
        .getClient()
        .from('loans')
        .select('*, member:members(*), book:books(*)')
        .eq('borrower_id', memberId);

      if (loansError) {
        console.warn('⚠️ Supabase loans query error:', loansError.message);
        return [];
      }

      const { data: reservations, error: reservationsError } = await this.supabaseService
        .getClient()
        .from('reservations')
        .select('*, member:members(*), book:books(*)')
        .eq('member_id', memberId);

      if (reservationsError) {
        console.warn('⚠️ Supabase reservations query error:', reservationsError.message);
        return loans?.map(loan => ({ ...loan, type: 'loan' })) || [];
      }

      const transactions = [
        ...(loans?.map(loan => ({ ...loan, type: 'loan' })) || []),
        ...(reservations?.map(reservation => ({ ...reservation, type: 'reservation' })) || []),
      ];

      return transactions;
    } catch (error: any) {
      // Handle timeout and other errors gracefully
      if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('aborted')) {
        console.warn('⚠️ Supabase query timeout, returning empty transactions list');
      } else {
        console.warn('⚠️ Supabase connection error, returning empty transactions list:', error.message);
      }
      return [];
    }
  }
}
