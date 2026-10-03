import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { CartItem, ComboCartLine, Product } from '@/types';

const CART_STORAGE_KEY = '@gt_mart_cart';

interface CartContextValue {
  items: CartItem[];
  combos: ComboCartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  addCombo: (line: Omit<ComboCartLine, 'quantity'>, quantity?: number) => void;
  removeCombo: (comboId: string) => void;
  updateComboQuantity: (comboId: string, quantity: number) => void;
  getComboQuantity: (comboId: string) => number;
  clearCart: () => void;
  getQuantity: (productId: string) => number;
  isLoaded: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function parseStoredCart(raw: string): { products: CartItem[]; combos: ComboCartLine[] } {
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed)) {
    return { products: parsed as CartItem[], combos: [] };
  }

  if (parsed && typeof parsed === 'object') {
    const record = parsed as { products?: CartItem[]; combos?: ComboCartLine[] };
    return {
      products: Array.isArray(record.products) ? record.products : [],
      combos: Array.isArray(record.combos) ? record.combos : [],
    };
  }

  return { products: [], combos: [] };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [combos, setCombos] = useState<ComboCartLine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = parseStoredCart(stored);
          setItems(parsed.products);
          setCombos(parsed.combos);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ products: items, combos }),
    );
  }, [items, combos, isLoaded]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...current, { product, quantity }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((current) => current.filter((item) => item.product.id !== productId));
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item,
      ),
    );
  }, []);

  const addCombo = useCallback((line: Omit<ComboCartLine, 'quantity'>, quantity = 1) => {
    setCombos((current) => {
      const existing = current.find((item) => item.comboId === line.comboId);
      if (existing) {
        return current.map((item) =>
          item.comboId === line.comboId
            ? { ...line, quantity: item.quantity + quantity }
            : item,
        );
      }
      return [...current, { ...line, quantity }];
    });
  }, []);

  const removeCombo = useCallback((comboId: string) => {
    setCombos((current) => current.filter((item) => item.comboId !== comboId));
  }, []);

  const updateComboQuantity = useCallback((comboId: string, quantity: number) => {
    if (quantity <= 0) {
      setCombos((current) => current.filter((item) => item.comboId !== comboId));
      return;
    }

    setCombos((current) =>
      current.map((item) => (item.comboId === comboId ? { ...item, quantity } : item)),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCombos([]);
  }, []);

  const getQuantity = useCallback(
    (productId: string) =>
      items.find((item) => item.product.id === productId)?.quantity ?? 0,
    [items],
  );

  const getComboQuantity = useCallback(
    (comboId: string) => combos.find((item) => item.comboId === comboId)?.quantity ?? 0,
    [combos],
  );

  const itemCount = useMemo(
    () =>
      items.reduce((total, item) => total + item.quantity, 0) +
      combos.reduce((total, item) => total + item.quantity, 0),
    [items, combos],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + item.product.price * item.quantity, 0) +
      combos.reduce((total, item) => total + item.comboPrice * item.quantity, 0),
    [items, combos],
  );

  const value = useMemo(
    () => ({
      items,
      combos,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      addCombo,
      removeCombo,
      updateComboQuantity,
      getComboQuantity,
      clearCart,
      getQuantity,
      isLoaded,
    }),
    [
      items,
      combos,
      itemCount,
      subtotal,
      addItem,
      removeItem,
      updateQuantity,
      addCombo,
      removeCombo,
      updateComboQuantity,
      getComboQuantity,
      clearCart,
      getQuantity,
      isLoaded,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
