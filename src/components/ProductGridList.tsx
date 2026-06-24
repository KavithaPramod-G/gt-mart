import { useMemo } from 'react';
import {
  FlatList,
  FlatListProps,
  StyleProp,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import { ProductCard } from '@/components/ProductCard';
import { ProductListFooter } from '@/components/ProductListFooter';
import { Product } from '@/types';

const GRID_PADDING = 12;
const GRID_GAP = 12;
const GRID_COLUMNS = 2;

type ProductGridListProps = Omit<
  FlatListProps<Product>,
  'data' | 'renderItem' | 'numColumns' | 'keyExtractor'
> & {
  products: Product[];
  isLoadingMore?: boolean;
  hasMore?: boolean;
};

export function useProductGridCardWidth() {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const totalGap = GRID_GAP * (GRID_COLUMNS - 1);
    return (width - GRID_PADDING * 2 - totalGap) / GRID_COLUMNS;
  }, [width]);
}

export function ProductGridList({
  products,
  isLoadingMore = false,
  hasMore = false,
  contentContainerStyle,
  ListFooterComponent,
  ...rest
}: ProductGridListProps) {
  const cardWidth = useProductGridCardWidth();

  const mergedContentStyle = useMemo((): StyleProp<ViewStyle> => {
    return [
      {
        paddingHorizontal: GRID_PADDING,
        paddingTop: 12,
        paddingBottom: 32,
      },
      contentContainerStyle,
    ];
  }, [contentContainerStyle]);

  return (
    <FlatList
      {...rest}
      data={products}
      keyExtractor={(item) => item.id}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={{ gap: GRID_GAP, justifyContent: 'flex-start' }}
      contentContainerStyle={mergedContentStyle}
      renderItem={({ item }) => (
        <View style={{ width: cardWidth }}>
          <ProductCard product={item} />
        </View>
      )}
      ListFooterComponent={
        ListFooterComponent ?? (
          <ProductListFooter
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            itemCount={products.length}
          />
        )
      }
    />
  );
}
