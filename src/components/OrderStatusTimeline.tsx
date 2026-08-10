import { Text, View } from 'react-native';

import { ORDER_STATUS_LABELS } from '@/constants/config';
import { STATUS_FLOW } from '@/context/OrderContext';
import { OrderStatus, WhatsAppNotification } from '@/types';
import { buildStatusNoteMap, getCancelReason } from '@/utils/orderStatusNotes';
import { cn } from '@/utils/cn';

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  statusUpdates?: WhatsAppNotification[];
}

export function OrderStatusTimeline({
  currentStatus,
  statusUpdates = [],
}: OrderStatusTimelineProps) {
  const statusNotes = buildStatusNoteMap(statusUpdates);

  if (currentStatus === 'cancelled') {
    const cancelReason = getCancelReason(statusUpdates);

    return (
      <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <Text className="text-[15px] font-semibold text-red-700">
          {ORDER_STATUS_LABELS.cancelled}
        </Text>
        <Text className="mt-1 text-sm text-red-600">
          {cancelReason ?? 'This order was cancelled by the shop.'}
        </Text>
      </View>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(currentStatus);

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      {STATUS_FLOW.map((status, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const note = statusNotes[status];

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
              {note && isComplete ? (
                <Text className="mt-1 text-sm leading-5 text-muted">{note}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
