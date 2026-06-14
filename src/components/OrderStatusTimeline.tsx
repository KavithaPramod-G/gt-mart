import { Text, View } from 'react-native';

import { ORDER_STATUS_LABELS } from '@/constants/config';
import { STATUS_FLOW } from '@/context/OrderContext';
import { OrderStatus } from '@/types';
import { cn } from '@/utils/cn';

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
}

export function OrderStatusTimeline({ currentStatus }: OrderStatusTimelineProps) {
  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      {STATUS_FLOW.map((status, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View key={status} className="min-h-12 flex-row">
            <View className="w-6 items-center">
              <View
                className={cn(
                  'mt-1 rounded-full bg-border',
                  isComplete && 'bg-primary',
                  isCurrent ? 'h-3.5 w-3.5' : 'h-3 w-3',
                )}
              />
              {index < STATUS_FLOW.length - 1 && (
                <View
                  className={cn(
                    'my-1 w-0.5 flex-1 bg-border',
                    index < currentIndex && 'bg-primary',
                  )}
                />
              )}
            </View>
            <View className="flex-1 pb-4 pl-2">
              <Text
                className={cn(
                  'text-[15px] text-muted',
                  isComplete && 'font-semibold text-foreground',
                )}
              >
                {ORDER_STATUS_LABELS[status]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
