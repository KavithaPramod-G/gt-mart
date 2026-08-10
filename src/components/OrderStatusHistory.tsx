import { Text, View } from 'react-native';

import { ORDER_STATUS_LABELS } from '@/constants/config';
import { WhatsAppNotification } from '@/types';
import {
  formatOrderHistoryTime,
  getSortedStatusUpdates,
} from '@/utils/orderStatusNotes';
import { cn } from '@/utils/cn';

interface OrderStatusHistoryProps {
  updates: WhatsAppNotification[];
}

export function OrderStatusHistory({ updates }: OrderStatusHistoryProps) {
  const history = getSortedStatusUpdates(updates);

  if (history.length === 0) {
    return (
      <Text className="text-sm text-muted">No status updates recorded yet.</Text>
    );
  }

  return (
    <View>
      {history.map((update, index) => {
        const isLast = index === history.length - 1;
        const isCancelled = update.status === 'cancelled';

        return (
          <View key={`${update.status}-${update.sentAt}`} className="min-h-14 flex-row">
            <View className="w-6 items-center">
              <View
                className={cn(
                  'mt-1.5 rounded-full',
                  isCancelled ? 'bg-red-500' : 'bg-primary',
                  isLast ? 'h-3.5 w-3.5' : 'h-3 w-3',
                )}
              />
              {!isLast ? (
                <View className="my-1 w-0.5 flex-1 bg-border" />
              ) : null}
            </View>

            <View className={cn('flex-1 pl-2', !isLast && 'pb-4')}>
              <Text
                className={cn(
                  'text-[15px] font-semibold',
                  isCancelled ? 'text-red-700' : 'text-foreground',
                )}
              >
                {ORDER_STATUS_LABELS[update.status]}
              </Text>
              <Text className="mt-0.5 text-xs text-muted">
                {formatOrderHistoryTime(update.sentAt)}
              </Text>
              {isCancelled && update.statusNote ? (
                <Text className="mt-1 text-sm leading-5 text-foreground">
                  Reason: {update.statusNote}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
