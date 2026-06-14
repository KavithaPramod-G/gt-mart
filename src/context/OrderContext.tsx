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

import { DELIVERY_FEE } from '@/constants/config';
import { generateOrderNumber, getNextSequenceFromOrders } from '@/services/orderNumber';
import {
  buildStatusUpdateMessage,
  notifyCustomerStatusUpdate,
  notifyShopNewOrder,
} from '@/services/whatsapp';
import { CartItem, DeliveryAddress, Order, OrderStatus } from '@/types';

const ORDERS_STORAGE_KEY = '@gt_mart_orders';

const STATUS_FLOW: OrderStatus[] = [
  'placed',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
];

interface OrderContextValue {
  orders: Order[];
  isLoaded: boolean;
  placeOrder: (items: CartItem[], address: DeliveryAddress) => Promise<Order>;
  getOrder: (id: string) => Order | undefined;
  advanceOrderStatus: (orderId: string) => Promise<Order | undefined>;
  sendWhatsAppUpdate: (orderId: string, status?: OrderStatus) => Promise<boolean>;
}

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ORDERS_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          setOrders(JSON.parse(stored) as Order[]);
        }
      })
      .finally(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }, [orders, isLoaded]);

  const getOrder = useCallback(
    (id: string) => orders.find((order) => order.id === id),
    [orders],
  );

  const placeOrder = useCallback(
    async (items: CartItem[], address: DeliveryAddress): Promise<Order> => {
      const subtotal = items.reduce(
        (total, item) => total + item.product.price * item.quantity,
        0,
      );
      const orderNumber = generateOrderNumber(
        getNextSequenceFromOrders(orders.map((order) => order.orderNumber)),
      );
      const now = new Date().toISOString();

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
        address,
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
                address,
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

      setOrders((current) => [order, ...current]);
      await notifyShopNewOrder(order);

      return order;
    },
    [orders],
  );

  const advanceOrderStatus = useCallback(
    async (orderId: string): Promise<Order | undefined> => {
      let updatedOrder: Order | undefined;

      setOrders((current) =>
        current.map((order) => {
          if (order.id !== orderId) return order;

          const currentIndex = STATUS_FLOW.indexOf(order.status);
          if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) {
            updatedOrder = order;
            return order;
          }

          const nextStatus = STATUS_FLOW[currentIndex + 1];
          const now = new Date().toISOString();
          updatedOrder = {
            ...order,
            status: nextStatus,
            updatedAt: now,
            whatsappNotifications: [
              ...order.whatsappNotifications,
              {
                status: nextStatus,
                sentAt: now,
                message: buildStatusUpdateMessage(order, nextStatus),
              },
            ],
          };

          return updatedOrder;
        }),
      );

      if (updatedOrder && updatedOrder.status !== 'placed') {
        await notifyCustomerStatusUpdate(updatedOrder, updatedOrder.status);
      }

      return updatedOrder;
    },
    [],
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
    }),
    [orders, isLoaded, placeOrder, getOrder, advanceOrderStatus, sendWhatsAppUpdate],
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
