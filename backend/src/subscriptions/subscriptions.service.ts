import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionTier } from '../models/subscription.entity';
import { User } from '../models/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionsRepository: Repository<Subscription>,
  ) {}

  async create(user: User, tier: SubscriptionTier, depositAmount: number): Promise<Subscription> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1-month free trial

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
