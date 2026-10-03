import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { fetchActiveCombos } from '@/services/api/combosApi';
import { ComboOffer, Product } from '@/types';

interface CombosContextValue {
  combos: ComboOffer[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  findCombosForProduct: (product: Product) => ComboOffer[];
}

const CombosContext = createContext<CombosContextValue | null>(null);

export function CombosProvider({ children }: { children: ReactNode }) {
  const [combos, setCombos] = useState<ComboOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchActiveCombos();
    setCombos(next);
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const findCombosForProduct = useCallback(
    (product: Product) =>
      combos.filter((combo) =>
        combo.items.some(
          (item) => item.itemId === product.id || item.productId === product.id,
        ),
      ),
    [combos],
  );

  const value = useMemo(
    () => ({ combos, isLoading, refresh, findCombosForProduct }),
    [combos, isLoading, refresh, findCombosForProduct],
  );

  return <CombosContext.Provider value={value}>{children}</CombosContext.Provider>;
}

export function useCombos() {
  const context = useContext(CombosContext);
  if (!context) {
    throw new Error('useCombos must be used within CombosProvider');
  }
  return context;
}
