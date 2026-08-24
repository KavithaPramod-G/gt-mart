import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { Product } from '@/types';

interface ProductImageProps {
  product: Pick<Product, 'emoji' | 'imageUrl' | 'imageUrls' | 'name'>;
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

function resolveGalleryUrls(product: Pick<Product, 'imageUrl' | 'imageUrls'>): string[] {
  const fromGallery = (product.imageUrls ?? [])
    .map((url) => url?.trim())
    .filter((url): url is string => Boolean(url));
  if (fromGallery.length > 0) return fromGallery;

  const primary = getImageUri(product.imageUrl);
  return primary ? [primary] : [];
}

export function ProductImage({ product, size = 'md' }: ProductImageProps) {
  const urls = useMemo(() => resolveGalleryUrls(product), [product.imageUrl, product.imageUrls]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const listRef = useRef<FlatList<string>>(null);
  const { width: windowWidth } = useWindowDimensions();

  const primaryUri = urls[0] ?? null;
  const showPhoto = Boolean(primaryUri) && !loadFailed;

  useEffect(() => {
    setLoadFailed(false);
    setActiveIndex(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [product.name, urls.join('|')]);

  if (size === 'card') {
    const pageWidth = frameWidth > 0 ? frameWidth : Math.max(160, Math.floor(windowWidth / 2 - 24));

    return (
      <View
        style={styles.cardFrame}
        className="overflow-hidden rounded-2xl bg-primary-light/40"
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== frameWidth) {
            setFrameWidth(nextWidth);
          }
        }}
      >
        {showPhoto ? (
          urls.length > 1 && pageWidth > 0 ? (
            <>
              <FlatList
                ref={listRef}
                data={urls}
                keyExtractor={(item, index) => `${item}-${index}`}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                style={{ width: pageWidth, height: pageWidth }}
                onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
                  setActiveIndex(Math.max(0, Math.min(index, urls.length - 1)));
                }}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item }}
                    accessibilityLabel={product.name}
                    style={{ width: pageWidth, height: pageWidth }}
                    resizeMode="cover"
                    onError={() => {
                      if (item === primaryUri) setLoadFailed(true);
                    }}
                  />
                )}
              />
              <View style={styles.dots} pointerEvents="none">
                {urls.map((url, index) => (
                  <View
                    key={`${url}-dot-${index}`}
                    style={[styles.dot, index === activeIndex ? styles.dotActive : null]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Image
              source={{ uri: primaryUri! }}
              accessibilityLabel={product.name}
              style={styles.cardImage}
              resizeMode="cover"
              onError={() => setLoadFailed(true)}
            />
          )
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
          source={{ uri: primaryUri! }}
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
  dots: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 8,
    height: 8,
  },
});
