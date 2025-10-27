import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionTier } from '../models/subscription.entity';
import { Member } from '../models/member.entity';
import { subscriptionPlans } from '../config/subscription-plans';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
  ) {}

  async create(member: Member, tier: SubscriptionTier): Promise<Subscription> {
    const plan = subscriptionPlans[tier];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.lendingPeriod);

    const subscription = this.subscriptionsRepository.create({
      member,
      tier,
      startDate,
      endDate,
      isActive: true,
      price: plan.price,
      lendingLimit: plan.lendingLimit,
    });

    return this.subscriptionsRepository.save(subscription);
  }
}
