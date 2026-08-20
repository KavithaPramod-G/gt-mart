import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DISCOUNT_DEAL_BUCKETS,
  DISCOUNT_DEALS_PREVIEW_LIMIT,
} from '@/constants/discountDeals';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchDiscountDealProducts } from '@/services/api/productsApi';
import { Product } from '@/types';
import { groupProductsByDiscountBuckets, getProductDiscountPercent } from '@/utils/productDiscount';

export function useDiscountDeals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const remote = await fetchDiscountDealProducts();
      setProducts(remote ?? []);
    } catch (error) {
      console.warn('[useDiscountDeals] refresh failed:', error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sections = useMemo(
    () =>
      groupProductsByDiscountBuckets(products, DISCOUNT_DEAL_BUCKETS).map(
        ({ bucket, products: bucketProducts }) => ({
          bucket,
          products: bucketProducts.slice(0, DISCOUNT_DEALS_PREVIEW_LIMIT),
        }),
      ),
    [products],
  );

  const maxDiscountPercent = useMemo(() => {
    if (products.length === 0) return 0;
    return products.reduce(
      (max, product) => Math.max(max, getProductDiscountPercent(product)),
      0,
    );
  }, [products]);

  return { sections, isLoading, maxDiscountPercent, refresh };
}
