import { Text, View } from 'react-native';

import { CURRENCY, SHOP_UPI_ID, SHOP_UPI_PAYEE_NAME } from '@/constants/config';
import { isShopUpiConfigured } from '@/services/upi';
import { cn } from '@/utils/cn';

interface ShopUpiDetailsProps {
  amount?: number;
  className?: string;
}

export function ShopUpiDetails({ amount, className }: ShopUpiDetailsProps) {
  if (!isShopUpiConfigured()) {
    return null;
  }

  return (
    <View className={cn('rounded-lg bg-background p-2.5', className)}>
      <Text className="text-xs font-semibold uppercase text-muted">Pay to</Text>
      <Text className="mt-0.5 text-sm font-bold text-primary">{SHOP_UPI_ID}</Text>
      <Text className="text-xs text-muted">{SHOP_UPI_PAYEE_NAME}</Text>
      {amount != null ? (
        <Text className="mt-1.5 text-xs font-semibold text-foreground">
          Amount: {CURRENCY}
          {amount}
        </Text>
      ) : null}
    </View>
  );
}
