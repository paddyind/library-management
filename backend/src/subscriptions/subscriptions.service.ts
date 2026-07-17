import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirestoreService } from '../config/firestore.service';
import { SqliteService } from '../config/sqlite.service';
import { usesFirebase } from '../config/storage.util';
import { Subscription, SubscriptionTier } from './subscription.interface';
import { Member } from '../members/member.interface';
import { subscriptionPlans } from '../config/subscription-plans';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly sqliteService: SqliteService,
    private readonly firestoreService: FirestoreService,
    private readonly configService: ConfigService,
  ) {}

  async create(member: Member, tier: SubscriptionTier): Promise<Subscription> {
    const plan = subscriptionPlans[tier];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.lendingPeriod);

    const subscription = {
      id: Date.now(),
      member_id: member.id,
      tier,
      startDate,
      endDate,
      isActive: true,
      price: plan.price,
      lendingLimit: plan.lendingLimit,
      createdAt: startDate,
      updatedAt: startDate,
    };
    if (usesFirebase(this.configService, this.firestoreService)) {
      await this.firestoreService.collection('subscriptions').doc(String(subscription.id)).set(subscription);
      return subscription;
    }
    this.sqliteService.getDatabase().prepare(
      'INSERT INTO subscriptions (id, member_id, tier, startDate, endDate, isActive, price, lendingLimit, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(subscription.id, member.id, tier, startDate.toISOString(), endDate.toISOString(), 1, plan.price, plan.lendingLimit, startDate.toISOString(), startDate.toISOString());
    return subscription;
  }
}
