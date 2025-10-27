import { SubscriptionTier } from '../models/subscription.entity';

export const subscriptionPlans = {
  [SubscriptionTier.FREE]: {
    name: 'Free',
    price: 0,
    trialPeriodDays: 0,
    lendingLimit: 3,
  },
  [SubscriptionTier.BRONZE]: {
    name: 'Bronze',
    price: 299,
    trialPeriodDays: 7,
    lendingLimit: 5,
  },
  [SubscriptionTier.SILVER]: {
    name: 'Silver',
    price: 499,
    trialPeriodDays: 14,
    lendingLimit: 10,
  },
  [SubscriptionTier.GOLD]: {
    name: 'Gold',
    price: 799,
    trialPeriodDays: 30,
    lendingLimit: 20,
  },
};
