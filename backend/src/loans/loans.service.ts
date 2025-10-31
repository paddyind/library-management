import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { CreateLoanDto } from '../dto/loan.dto';
import { Loan } from './loan.interface';
import { Member } from '../members/member.interface';
import { Book } from '../books/book.interface';
import { subscriptionPlans } from '../config/subscription-plans';
import { Subscription } from '../subscriptions/subscription.interface';

@Injectable()
export class LoansService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(createLoanDto: CreateLoanDto, member: Member, book: Book): Promise<Loan> {
    const { data: subscriptions, error: subscriptionsError } = await this.supabaseService
      .getClient()
      .from('subscriptions')
      .select('*')
      .eq('member_id', member.id)
      .order('createdAt', { ascending: false });

    if (subscriptionsError) {
      throw new Error(subscriptionsError.message);
    }

    const subscription = subscriptions[0] as Subscription;
    const plan = subscriptionPlans[subscription.tier];

    const { count, error: countError } = await this.supabaseService
      .getClient()
      .from('loans')
      .select('*', { count: 'exact', head: true })
      .eq('borrower_id', member.id)
      .is('returnDate', null);

    if (countError) {
      throw new Error(countError.message);
    }

    if (count !== null && count >= plan.lendingLimit) {
      throw new ConflictException('You have reached your borrowing limit.');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('loans')
      .insert([
        {
          ...createLoanDto,
          borrower_id: member.id,
          book_id: book.id,
        },
      ])
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
