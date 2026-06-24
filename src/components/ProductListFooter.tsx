import { ActivityIndicator, View } from 'react-native';

interface ProductListFooterProps {
  isLoadingMore: boolean;
  hasMore: boolean;
  itemCount: number;
}

export function ProductListFooter({
  isLoadingMore,
  hasMore,
  itemCount,
}: ProductListFooterProps) {
  if (itemCount === 0) return null;

  if (isLoadingMore) {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color="#1B7A4E" />
      </View>
    );
  }

  if (!hasMore) {
    return <View className="h-4" />;
  }

  return null;
}
