import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DELIVERY_FEE } from '@/constants/config';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/env';
import {
  fetchOrdersByPhone,
  placeOrderInDb,
  updateOrderStatusInDb,
} from '@/services/api/ordersApi';
import { generateOrderNumber, getNextSequenceFromOrders } from '@/services/orderNumber';
import {
  buildStatusUpdateMessage,
  notifyCustomerStatusUpdate,
  notifyShopNewOrder,
} from '@/services/whatsapp';
import { normalizePhone } from '@/services/auth';
import { CartItem, DeliveryAddress, Order, OrderStatus } from '@/types';

const ORDERS_STORAGE_KEY = '@gt_mart_orders';

const STATUS_FLOW: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

interface OrderContextValue {
  orders: Order[];
  isLoaded: boolean;
  placeOrder: (items: CartItem[], address: DeliveryAddress) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
  advanceOrderStatus: (orderId: string) => Promise<Order | undefined>;
  sendWhatsAppUpdate: (orderId: string, status?: OrderStatus) => Promise<boolean>;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded: authLoaded } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshOrders = useCallback(async () => {
    if (isSupabaseConfigured() && user?.phone) {
      const remote = await fetchOrdersByPhone(user.phone);
      if (remote) {
        setOrders(remote);
        await AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(remote));
        return;
      }
    }

    const stored = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
    if (stored) {
      setOrders(JSON.parse(stored) as Order[]);
    }
  }, [user?.phone]);

  useEffect(() => {
    if (!authLoaded) return;

    refreshOrders().finally(() => setIsLoaded(true));
  }, [authLoaded, refreshOrders]);

  const prevUserRef = useRef(user);

  useEffect(() => {
    if (!authLoaded) return;

    const wasLoggedIn = Boolean(prevUserRef.current);
    const isLoggedIn = Boolean(user);

    if (wasLoggedIn && !isLoggedIn) {
      setOrders([]);
      AsyncStorage.removeItem(ORDERS_STORAGE_KEY);
    }

    prevUserRef.current = user;
  }, [authLoaded, user]);

  useEffect(() => {
    if (!isLoaded || isSupabaseConfigured()) return;
    AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders, isLoaded]);

  const getOrder = useCallback(
    (id: string) => orders.find((order) => order.id === id),
    [orders],
  );

  const placeOrderLocal = useCallback(
    (items: CartItem[], address: DeliveryAddress): Order => {
      const subtotal = items.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      );
      const orderNumber = generateOrderNumber(
        getNextSequenceFromOrders(orders.map((order) => order.orderNumber)),
      );
      const now = new Date().toISOString();
      const normalizedAddress = {
        ...address,
        phone: normalizePhone(address.phone),
      };

      const order: Order = {
        id: `${Date.now()}`,
        orderNumber,
        items: items.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          unit: item.product.unit,
        })),
        subtotal,
        deliveryFee: DELIVERY_FEE,
        total: subtotal + DELIVERY_FEE,
        paymentMethod: 'cod',
        address: normalizedAddress,
        status: 'placed',
        createdAt: now,
        updatedAt: now,
        whatsappNotifications: [
          {
            status: 'placed',
            sentAt: now,
            message: buildStatusUpdateMessage(
              {
                id: `${Date.now()}`,
                orderNumber,
                items: [],
                subtotal,
                deliveryFee: DELIVERY_FEE,
                total: subtotal + DELIVERY_FEE,
                paymentMethod: 'cod',
                address: normalizedAddress,
                status: 'placed',
                createdAt: now,
                updatedAt: now,
                whatsappNotifications: [],
              },
              'placed',
            ),
          },
        ],
      };

      return order;
    },
    [orders],
  );

  const placeOrder = useCallback(
    async (items: CartItem[], address: DeliveryAddress): Promise<Order> => {
      let order: Order | null = null;

      if (isSupabaseConfigured()) {
        order = await placeOrderInDb(items, address, user?.id);
      }

      if (!order) {
        order = placeOrderLocal(items, address);
        setOrders((current) => [order!, ...current]);
        if (!isSupabaseConfigured()) {
          await AsyncStorage.setItem(
            ORDERS_STORAGE_KEY,
            JSON.stringify([order, ...orders]),
          );
        }
      } else {
        setOrders((current) => [order!, ...current]);
        await AsyncStorage.setItem(
          ORDERS_STORAGE_KEY,
          JSON.stringify([order, ...orders.filter((o) => o.id !== order!.id)]),
        );
      }

      await notifyShopNewOrder(order);
      return order;
    },
    [placeOrderLocal, orders, user?.id],
  );

  const advanceOrderStatus = useCallback(
    async (orderId: string): Promise<Order | undefined> => {
      const existing = orders.find((order) => order.id === orderId);
      if (!existing) return undefined;

      const currentIndex = STATUS_FLOW.indexOf(existing.status);
      if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) {
        return existing;
      }

      const nextStatus = STATUS_FLOW[currentIndex + 1];
      const message = buildStatusUpdateMessage(existing, nextStatus);

      let updatedOrder: Order | undefined;

      if (isSupabaseConfigured() && isUuid(orderId)) {
        const remote = await updateOrderStatusInDb(orderId, nextStatus, message);
        if (remote) {
          updatedOrder = remote;
        }
      }

      if (!updatedOrder) {
        const now = new Date().toISOString();
        updatedOrder = {
          ...existing,
          status: nextStatus,
          updatedAt: now,
          whatsappNotifications: [
            ...existing.whatsappNotifications,
            { status: nextStatus, sentAt: now, message },
          ],
        };
      }

      setOrders((current) =>
        current.map((order) => (order.id === orderId ? updatedOrder! : order)),
      );

      if (nextStatus !== 'placed') {
        await notifyCustomerStatusUpdate(updatedOrder, nextStatus);
      }

      return updatedOrder;
    },
    [orders],
  );

  const sendWhatsAppUpdate = useCallback(
    async (orderId: string, status?: OrderStatus): Promise<boolean> => {
      const order = orders.find((entry) => entry.id === orderId);
      if (!order) return false;

      const targetStatus = status ?? order.status;
      return notifyCustomerStatusUpdate(order, targetStatus);
    },
    [orders],
  );

  const value = useMemo(
    () => ({
      orders,
      isLoaded,
      placeOrder,
      getOrder,
      advanceOrderStatus,
      sendWhatsAppUpdate,
      refreshOrders,
    }),
    [
      orders,
      isLoaded,
      placeOrder,
      getOrder,
      advanceOrderStatus,
      sendWhatsAppUpdate,
      refreshOrders,
    ],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
}

export { STATUS_FLOW };
