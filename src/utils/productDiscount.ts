import { Product } from '@/types';

export function getProductDiscountPercent(product: Product): number {
  if (product.mrp <= product.price || product.mrp <= 0) return 0;
  return Math.round(((product.mrp - product.price) / product.mrp) * 100);
}

export interface DiscountBucketDefinition {
  id: string;
  label: string;
  /** Discount must be greater than this (e.g. 0 for up to 10%). */
  minExclusive: number;
  /** Inclusive upper bound, or null for open-ended (above 30%). */
  maxInclusive: number | null;
}

export function productMatchesDiscountBucket(
  product: Product,
  bucket: DiscountBucketDefinition,
): boolean {
  const discount = getProductDiscountPercent(product);
  if (discount <= bucket.minExclusive) return false;
  if (bucket.maxInclusive == null) return true;
  return discount <= bucket.maxInclusive;
}

export function groupProductsByDiscountBuckets(
  products: Product[],
  buckets: DiscountBucketDefinition[],
): Array<{ bucket: DiscountBucketDefinition; products: Product[] }> {
  return buckets
    .map((bucket) => ({
      bucket,
      products: products
        .filter((product) => productMatchesDiscountBucket(product, bucket))
        .sort(
          (a, b) => getProductDiscountPercent(b) - getProductDiscountPercent(a),
        ),
    }))
    .filter((entry) => entry.products.length > 0);
}
