import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CURRENCY } from '@/constants/config';
import { useCombos } from '@/context/CombosContext';
import { ComboOffer } from '@/types';

function ComboCard({ combo }: { combo: ComboOffer }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/combo/[id]', params: { id: combo.id } })
      }
      className="mr-3 w-[188px] rounded-2xl border border-border bg-surface p-2.5 active:opacity-90"
    >
      {combo.savePercent > 0 ? (
        <View className="self-start rounded-md bg-primary px-2 py-0.5">
          <Text className="text-[11px] font-bold text-white">Save {combo.savePercent}%</Text>
        </View>
      ) : null}
      <Text className="mt-2 text-[14px] font-bold text-foreground" numberOfLines={2}>
        {combo.emoji} {combo.title}
      </Text>
      <Text className="mt-0.5 text-[12px] text-muted" numberOfLines={1}>
        {combo.items.length} items{combo.eventTag ? ` · ${combo.eventTag}` : ''}
      </Text>
      <View className="mt-1.5 flex-row items-center">
        {combo.regularTotal > combo.comboPrice ? (
          <Text className="mr-1.5 text-[12px] text-muted line-through">
            {CURRENCY}
            {combo.regularTotal}
          </Text>
        ) : null}
        <Text className="text-base font-extrabold text-primary">
          {CURRENCY}
          {combo.comboPrice}
        </Text>
      </View>
      <View className="mt-2 items-center rounded-lg bg-primary py-2">
        <Text className="text-[13px] font-semibold text-white">View combo</Text>
      </View>
    </Pressable>
  );
}

export function FestivalCombosSection() {
  const { combos, isLoading } = useCombos();

  if (isLoading || combos.length === 0) {
    return null;
  }

  return (
    <View className="mb-5">
      <Text className="text-[17px] font-extrabold text-foreground">Festival combos</Text>
      <View className="mt-1.5 h-1 w-14 rounded-full bg-primary" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {combos.map((combo) => (
          <ComboCard key={combo.id} combo={combo} />
        ))}
      </ScrollView>
      <Pressable
        onPress={() => router.push('/combos')}
        className="mt-3 rounded-2xl border-2 border-primary bg-primary-light p-3 active:opacity-90"
      >
        <Text className="text-[15px] font-bold text-foreground">Festival combo packs</Text>
        <Text className="mt-0.5 text-xs text-muted">Tap to browse all bundles →</Text>
      </Pressable>
    </View>
  );
}
