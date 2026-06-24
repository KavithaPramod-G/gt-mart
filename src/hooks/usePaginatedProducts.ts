import { useCallback, useEffect, useRef, useState } from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import {
  fetchProductsPage,
  FetchProductsPageParams,
  PRODUCTS_PAGE_SIZE,
} from '@/services/api/productsApi';
import { Product } from '@/types';

interface UsePaginatedProductsOptions {
  categoryId?: string | null;
  search?: string;
  pageSize?: number;
  /** When false, clears list and skips fetching (e.g. home screen before search). */
  enabled?: boolean;
  debounceMs?: number;
}

interface UsePaginatedProductsResult {
  products: Product[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
}

export function usePaginatedProducts(
  options: UsePaginatedProductsOptions = {},
): UsePaginatedProductsResult {
  const {
    categoryId = null,
    search = '',
    pageSize = PRODUCTS_PAGE_SIZE,
    enabled = true,
    debounceMs = 300,
  } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(enabled && isSupabaseConfigured());
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());

  const pageRef = useRef(0);
  const requestIdRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), debounceMs);
    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  const fetchPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      if (!enabled || !isSupabaseConfigured()) {
        setProducts([]);
        setTotalCount(0);
        setHasMore(false);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      const params: FetchProductsPageParams = {
        page,
        pageSize,
        categoryId,
        search: debouncedSearch || undefined,
      };

      if (mode === 'replace') {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
        loadingMoreRef.current = true;
      }

      try {
        const result = await fetchProductsPage(params);
        if (requestId !== requestIdRef.current) return;

        if (!result) {
          if (mode === 'replace') {
            setProducts([]);
            setTotalCount(0);
            setHasMore(false);
          }
          return;
        }

        pageRef.current = page;
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
        setProducts((current) =>
          mode === 'replace' ? result.products : [...current, ...result.products],
        );
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
          loadingMoreRef.current = false;
        }
      }
    },
    [categoryId, debouncedSearch, enabled, pageSize],
  );

  const refresh = useCallback(async () => {
    pageRef.current = 0;
    await fetchPage(0, 'replace');
  }, [fetchPage]);

  useEffect(() => {
    pageRef.current = 0;
    void fetchPage(0, 'replace');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || isLoading || isLoadingMore || loadingMoreRef.current) return;
    void fetchPage(pageRef.current + 1, 'append');
  }, [enabled, fetchPage, hasMore, isLoading, isLoadingMore]);

  return {
    products,
    totalCount,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    refresh,
  };
}
