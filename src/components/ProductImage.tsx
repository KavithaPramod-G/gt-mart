import { Image, Text, View } from 'react-native';

import { Product } from '@/types';

interface ProductImageProps {
  product: Pick<Product, 'emoji' | 'imageUrl' | 'name'>;
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: { box: 'h-12 w-12', text: 'text-2xl' },
  md: { box: 'h-14 w-14', text: 'text-3xl' },
} as const;

export function ProductImage({ product, size = 'md' }: ProductImageProps) {
  const styles = sizeStyles[size];

  if (product.imageUrl) {
    return (
      <View className={`${styles.box} overflow-hidden rounded-xl bg-primary-light`}>
        <Image
          source={{ uri: product.imageUrl }}
          accessibilityLabel={product.name}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View className={`${styles.box} items-center justify-center rounded-xl bg-primary-light`}>
      <Text className={styles.text}>{product.emoji}</Text>
    </View>
  );
}
