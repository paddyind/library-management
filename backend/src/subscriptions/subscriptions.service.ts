import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../config/supabase.service';
import { Subscription, SubscriptionTier } from './subscription.interface';
import { Member } from '../members/member.interface';
import { subscriptionPlans } from '../config/subscription-plans';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(member: Member, tier: SubscriptionTier): Promise<Subscription> {
    const plan = subscriptionPlans[tier];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.lendingPeriod);

    const { data, error } = await this.supabaseService
      .getClient()
      .from('subscriptions')
      .insert([
        {
          member_id: member.id,
          tier,
          startDate,
          endDate,
          isActive: true,
          price: plan.price,
          lendingLimit: plan.lendingLimit,
        },
      ])
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
