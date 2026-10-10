import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { ProductImageViewer } from '@/components/ProductImageViewer';
import { categoryShowsFullPhoto } from '@/constants/categoryMeta';
import { Product } from '@/types';

interface ProductImageProps {
  product: Pick<Product, 'emoji' | 'imageUrl' | 'imageUrls' | 'name' | 'category'>;
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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [frameWidth, setFrameWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();

  const primaryUri = urls[0] ?? null;
  const showPhoto = Boolean(primaryUri) && !loadFailed;
  const resizeMode = categoryShowsFullPhoto(product.category) ? 'contain' : 'cover';

  useEffect(() => {
    setLoadFailed(false);
    setViewerOpen(false);
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
          <Pressable
            onPress={() => setViewerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={
              urls.length > 1 ? `Open ${urls.length} photos of ${product.name}` : `Open photo of ${product.name}`
            }
            style={styles.cardImage}
          >
            <Image
              source={{ uri: primaryUri! }}
              accessibilityLabel={product.name}
              style={{ width: pageWidth, height: pageWidth }}
              resizeMode={resizeMode}
              onError={() => setLoadFailed(true)}
            />
            {urls.length > 1 ? (
              <View style={styles.photoCount} pointerEvents="none">
                <Text style={styles.photoCountText}>{urls.length} photos</Text>
              </View>
            ) : null}
          </Pressable>
        ) : (
          <View style={styles.cardFallback} className="items-center justify-center bg-primary-light/50">
            <Text className="text-5xl">{product.emoji || '🛒'}</Text>
          </View>
        )}
        {viewerOpen && urls.length > 0 ? (
          <ProductImageViewer
            urls={urls}
            name={product.name}
            resizeMode={resizeMode}
            onClose={() => setViewerOpen(false)}
          />
        ) : null}
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
          resizeMode={resizeMode}
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
  photoCount: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
