export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

export interface Subscription {
  id: number;
  member_id: string;
  tier: SubscriptionTier;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  price: number;
  lendingLimit: number;
  createdAt: Date;
  updatedAt: Date;
}
