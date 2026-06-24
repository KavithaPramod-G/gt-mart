import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { isSupabaseConfigured } from '@/lib/env';
import { fetchInStockCountByCategory } from '@/services/api/productsApi';

interface ProductsContextValue {
  categoryCounts: Record<string, number>;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCategoryCounts({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const counts = await fetchInStockCountByCategory();
      setCategoryCounts(counts ?? {});
    } catch (error) {
      console.warn('[ProductsContext] refresh failed:', error);
      setCategoryCounts({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ categoryCounts, isLoading, refresh }),
    [categoryCounts, isLoading, refresh],
  );

  return (
    <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider');
  }
  return context;
}
