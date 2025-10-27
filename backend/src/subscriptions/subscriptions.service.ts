import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionTier } from '../models/subscription.entity';
import { User } from '../models/user.entity';
import { subscriptionPlans } from '../config/subscription-plans';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
  ) {}

  getPlanDetails(tier: SubscriptionTier) {
    return subscriptionPlans[tier];
  }

  async create(user: User, tier: SubscriptionTier, depositAmount: number): Promise<Subscription> {
    const plan = this.getPlanDetails(tier);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.trialPeriodDays);

    const subscription = this.subscriptionsRepository.create({
      user,
      tier,
      startDate,
      endDate,
      isActive: true,
      depositAmount,
    });

    return this.subscriptionsRepository.save(subscription);
  }
}
