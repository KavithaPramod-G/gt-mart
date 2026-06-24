import { Text, View } from 'react-native';

import { CURRENCY } from '@/constants/config';

interface ProductPriceProps {
  mrp: number;
  price: number;
  size?: 'sm' | 'md';
  showDiscountPercent?: boolean;
}

export function ProductPrice({
  mrp,
  price,
  size = 'md',
  showDiscountPercent = true,
}: ProductPriceProps) {
  const showDiscount = mrp > price;
  const saleClass = size === 'sm' ? 'text-[13px]' : 'text-[15px]';
  const mrpClass = size === 'sm' ? 'text-[11px]' : 'text-[13px]';

  return (
    <View className="mt-1 flex-row flex-wrap items-center gap-2">
      <Text className={`${saleClass} font-bold text-primary`}>
        {CURRENCY}
        {price}
      </Text>
      {showDiscount ? (
        <>
          <Text className={`${mrpClass} text-muted line-through`}>
            MRP {CURRENCY}
            {mrp}
          </Text>
          {showDiscountPercent ? (
            <Text className={`${mrpClass} font-semibold text-accent`}>
              {Math.round(((mrp - price) / mrp) * 100)}% off
            </Text>
          ) : null}
        </>
      ) : (
        <Text className={`${mrpClass} text-muted`}>MRP {CURRENCY}{mrp}</Text>
      )}
    </View>
  );
}
