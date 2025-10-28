import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';

@Injectable()
export class TransactionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<any[]> {
    const { data: loans, error: loansError } = await this.supabaseService
      .getClient()
      .from('loans')
      .select('*, member:members(*), book:books(*)');

    if (loansError) {
      throw new Error(loansError.message);
    }

    const { data: reservations, error: reservationsError } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*, member:members(*), book:books(*)');

    if (reservationsError) {
      throw new Error(reservationsError.message);
    }

    const transactions = [
      ...loans.map(loan => ({ ...loan, type: 'loan' })),
      ...reservations.map(reservation => ({ ...reservation, type: 'reservation' })),
    ];

    return transactions;
  }

  async findMemberTransactions(memberId: string): Promise<any[]> {
    const { data: loans, error: loansError } = await this.supabaseService
      .getClient()
      .from('loans')
      .select('*, member:members(*), book:books(*)')
      .eq('borrower_id', memberId);

    if (loansError) {
      throw new Error(loansError.message);
    }

    const { data: reservations, error: reservationsError } = await this.supabaseService
      .getClient()
      .from('reservations')
      .select('*, member:members(*), book:books(*)')
      .eq('member_id', memberId);

    if (reservationsError) {
      throw new Error(reservationsError.message);
    }

    const transactions = [
      ...loans.map(loan => ({ ...loan, type: 'loan' })),
      ...reservations.map(reservation => ({ ...reservation, type: 'reservation' })),
    ];

    return transactions;
  }
}
