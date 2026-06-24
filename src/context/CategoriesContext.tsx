import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { DEFAULT_CATEGORY_UI } from '@/constants/categoryMeta';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCategoriesFromDb } from '@/services/api/categoriesApi';
import { ShopCategory } from '@/types';

interface CategoriesContextValue {
  categories: ShopCategory[];
  categoryById: Record<string, ShopCategory>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  getCategoryLabel: (categoryId: string) => string;
  getCategoryUi: (categoryId: string) => ShopCategory;
  isKnownCategoryId: (categoryId: string) => boolean;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const remote = await fetchCategoriesFromDb();
      setCategories(remote ?? []);
    } catch (error) {
      console.warn('[CategoriesContext] refresh failed:', error);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  );

  const getCategoryLabel = useCallback(
    (categoryId: string) => categoryById[categoryId]?.label ?? categoryId,
    [categoryById],
  );

  const getCategoryUi = useCallback(
    (categoryId: string): ShopCategory => {
      const category = categoryById[categoryId];
      if (category) return category;

      return {
        id: categoryId,
        label: categoryId,
        sortOrder: 0,
        ...DEFAULT_CATEGORY_UI,
      };
    },
    [categoryById],
  );

  const isKnownCategoryId = useCallback(
    (categoryId: string) => Boolean(categoryById[categoryId]),
    [categoryById],
  );

  const value = useMemo(
    () => ({
      categories,
      categoryById,
      isLoading,
      refresh,
      getCategoryLabel,
      getCategoryUi,
      isKnownCategoryId,
    }),
    [
      categories,
      categoryById,
      isLoading,
      refresh,
      getCategoryLabel,
      getCategoryUi,
      isKnownCategoryId,
    ],
  );

  return (
    <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return context;
}
