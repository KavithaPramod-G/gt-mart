import { DiscountBucketDefinition } from '@/utils/productDiscount';

export const DISCOUNT_DEAL_BUCKETS: DiscountBucketDefinition[] = [
  { id: 'upto-10', label: 'Up to 10% off', minExclusive: 0, maxInclusive: 10 },
  { id: '10-20', label: '10% to 20% off', minExclusive: 10, maxInclusive: 20 },
  { id: '20-30', label: '20% to 30% off', minExclusive: 20, maxInclusive: 30 },
  { id: '30-plus', label: 'Above 30% off', minExclusive: 30, maxInclusive: null },
];

/** Max products shown per discount row on the home screen. */
export const DISCOUNT_DEALS_PREVIEW_LIMIT = 12;
