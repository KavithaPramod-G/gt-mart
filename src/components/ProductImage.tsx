import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Product } from '@/types';

interface ProductImageProps {
  product: Pick<Product, 'emoji' | 'imageUrl' | 'name'>;
  size?: 'sm' | 'md' | 'card';
}

const fixedSizes = {
  sm: 48,
  md: 56,
} as const;

function getImageUri(imageUrl?: string | null): string | null {
  const uri = imageUrl?.trim();
  return uri ? uri : null;
}

export function ProductImage({ product, size = 'md' }: ProductImageProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const uri = getImageUri(product.imageUrl);
  const showPhoto = Boolean(uri) && !loadFailed;

  useEffect(() => {
    setLoadFailed(false);
  }, [uri, product.name]);

  if (size === 'card') {
    return (
      <View style={styles.cardFrame} className="overflow-hidden rounded-2xl bg-primary-light/40">
        {showPhoto ? (
          <Image
            source={{ uri: uri! }}
            accessibilityLabel={product.name}
            style={styles.cardImage}
            resizeMode="cover"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <View style={styles.cardFallback} className="items-center justify-center bg-primary-light/50">
            <Text className="text-5xl">{product.emoji || '🛒'}</Text>
          </View>
        )}
      </View>
    );
  }

  const dimension = fixedSizes[size];
  const frameStyle: ViewStyle = {
    width: dimension,
    height: dimension,
    borderRadius: 12,
    overflow: 'hidden',
  };

  if (showPhoto) {
    return (
      <View style={frameStyle} className="bg-primary-light/40">
        <Image
          source={{ uri: uri! }}
          accessibilityLabel={product.name}
          style={{ width: dimension, height: dimension }}
          resizeMode="cover"
          onError={() => setLoadFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={frameStyle} className="items-center justify-center bg-primary-light/50">
      <Text className={size === 'sm' ? 'text-2xl' : 'text-3xl'}>{product.emoji || '🛒'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cardFrame: {
    width: '100%',
    aspectRatio: 1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
  },
});
