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
import {
  fetchCategoriesFromDb,
  fetchCategoryParentGroupsFromDb,
} from '@/services/api/categoriesApi';
import { CategoryParentGroup, ShopCategory } from '@/types';

interface CategoriesContextValue {
  categories: ShopCategory[];
  parentGroups: CategoryParentGroup[];
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
  const [parentGroups, setParentGroups] = useState<CategoryParentGroup[]>([]);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setCategories([]);
      setParentGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [remoteCategories, remoteParentGroups] = await Promise.all([
        fetchCategoriesFromDb(),
        fetchCategoryParentGroupsFromDb(),
      ]);
      setCategories(remoteCategories ?? []);
      setParentGroups(remoteParentGroups ?? []);
    } catch (error) {
      console.warn('[CategoriesContext] refresh failed:', error);
      setCategories([]);
      setParentGroups([]);
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
        imageUrl: null,
        parentGroupId: null,
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
      parentGroups,
      categoryById,
      isLoading,
      refresh,
      getCategoryLabel,
      getCategoryUi,
      isKnownCategoryId,
    }),
    [
      categories,
      parentGroups,
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
