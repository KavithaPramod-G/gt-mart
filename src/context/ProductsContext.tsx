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
import { fetchProductsFromDb } from '@/services/api/productsApi';
import { Product } from '@/types';

interface ProductsContextValue {
  products: Product[];
  isLoading: boolean;
  source: 'local' | 'database';
  refresh: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [source, setSource] = useState<'local' | 'database'>('local');

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setProducts([]);
      setSource('local');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const remote = await fetchProductsFromDb();
      if (remote) {
        setProducts(remote);
        setSource('database');
      } else {
        setProducts([]);
        setSource('local');
      }
    } catch (error) {
      console.warn('[ProductsContext] refresh failed:', error);
      setProducts([]);
      setSource('local');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ products, isLoading, source, refresh }),
    [products, isLoading, source, refresh],
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
