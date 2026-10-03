import { Pressable, Text, View } from 'react-native';

import { CURRENCY } from '@/constants/config';
import { useCart } from '@/context/CartContext';
import { ComboCartLine } from '@/types';

interface CartComboRowProps {
  line: ComboCartLine;
}

export function CartComboRow({ line }: CartComboRowProps) {
  const { updateComboQuantity, removeCombo } = useCart();

  return (
    <View className="mb-2 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
          <Text className="text-2xl">{line.emoji || '🎁'}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground">{line.title}</Text>
          <Text className="mt-0.5 text-[13px] text-muted">
            Combo · {line.quantity} pack{line.quantity === 1 ? '' : 's'}
          </Text>
          {line.regularTotal > line.comboPrice ? (
            <Text className="mt-1 text-[12px] text-muted line-through">
              {CURRENCY}
              {line.regularTotal} if bought separately
            </Text>
          ) : null}
          <Text className="mt-0.5 text-[15px] font-bold text-primary">
            {CURRENCY}
            {line.comboPrice * line.quantity}
          </Text>
        </View>
        <View className="items-end justify-between">
          <View className="flex-row items-center overflow-hidden rounded-lg bg-primary-light">
            <Pressable
              onPress={() => updateComboQuantity(line.comboId, line.quantity - 1)}
              className="h-7 w-7 items-center justify-center"
            >
              <Text className="text-base font-bold text-primary">−</Text>
            </Pressable>
            <Text className="min-w-6 text-center font-bold text-foreground">{line.quantity}</Text>
            <Pressable
              onPress={() => updateComboQuantity(line.comboId, line.quantity + 1)}
              className="h-7 w-7 items-center justify-center"
            >
              <Text className="text-base font-bold text-primary">+</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => removeCombo(line.comboId)}>
            <Text className="text-[13px] font-semibold text-error">Remove</Text>
          </Pressable>
        </View>
      </View>
      {line.includedSummary ? (
        <Text className="mt-2 text-[12px] text-muted">{line.includedSummary}</Text>
      ) : null}
    </View>
  );
}
