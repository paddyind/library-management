export const subscriptionPlans = {
  FREE: {
    name: 'Free (1 week)',
    price: 0,
    lendingLimit: 2,
    concurrentLendingLimit: 1,
    lendingPeriod: 7, // days
  },
  BRONZE: {
    name: 'Bronze',
    price: 299,
    lendingLimit: 5,
    concurrentLendingLimit: 1,
    lendingPeriod: 30, // days
  },
  SILVER: {
    name: 'Silver',
    price: 599,
    lendingLimit: 10,
    concurrentLendingLimit: 2,
    lendingPeriod: 30, // days
  },
  GOLD: {
    name: 'Gold',
    price: 999,
    lendingLimit: 20,
    concurrentLendingLimit: 2,
    lendingPeriod: 30, // days
  },
};
