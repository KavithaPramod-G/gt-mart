import { useEffect, useState } from 'react';
import { Image, ImageStyle, LayoutChangeEvent, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { ShopCategory } from '@/types';

type CategoryImageSource = Pick<ShopCategory, 'emoji' | 'imageUrl' | 'label'>;

interface CategoryImageProps {
  category: CategoryImageSource;
  size?: 'sm' | 'md' | 'card' | 'hero';
  /** Known frame width — scales emoji fallback to match photo cards */
  frameWidth?: number;
}

const fixedSizes = {
  sm: 40,
  md: 56,
} as const;

const CARD_ASPECT = 1.6;

function getEmojiFontSize(size: 'hero' | 'card' | 'sm' | 'md', frameWidth: number): number {
  if (size === 'hero') {
    return Math.round(frameWidth * 0.58);
  }
  if (size === 'card') {
    const frameHeight = frameWidth / CARD_ASPECT;
    return Math.round(Math.min(frameWidth, frameHeight) * 0.55);
  }
  return size === 'sm' ? 22 : 30;
}

function getImageUri(imageUrl?: string | null): string | null {
  const uri = imageUrl?.trim();
  return uri ? uri : null;
}

function EmojiFallback({
  emoji,
  fontSize,
  style,
}: {
  emoji: string;
  fontSize: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.emojiFallback, style]} className="items-center justify-center">
      <Text style={{ fontSize, lineHeight: fontSize * 1.05 }}>{emoji}</Text>
    </View>
  );
}

export function CategoryImage({ category, size = 'md', frameWidth }: CategoryImageProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [measuredWidth, setMeasuredWidth] = useState(frameWidth ?? 0);
  const uri = getImageUri(category.imageUrl);
  const showPhoto = Boolean(uri) && !loadFailed;

  useEffect(() => {
    setLoadFailed(false);
  }, [uri, category.label]);

  useEffect(() => {
    if (frameWidth) {
      setMeasuredWidth(frameWidth);
    }
  }, [frameWidth]);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    const layoutWidth = event.nativeEvent.layout.width;
    if (layoutWidth > 0) {
      setMeasuredWidth(layoutWidth);
    }
  };

  const emoji = category.emoji || '🛒';
  const emojiSize =
    measuredWidth > 0 ? getEmojiFontSize(size, measuredWidth) : getEmojiFontSize(size, 96);

  if (size === 'hero') {
    return (
      <View style={styles.heroFrame} className="bg-white" onLayout={onFrameLayout}>
        {showPhoto ? (
          <Image
            source={{ uri: uri! }}
            accessibilityLabel={category.label}
            style={styles.heroImage}
            resizeMode="contain"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <EmojiFallback emoji={emoji} fontSize={emojiSize} style={styles.heroFallback} />
        )}
      </View>
    );
  }

  if (size === 'card') {
    return (
      <View
        style={styles.cardFrame}
        className="overflow-hidden rounded-xl bg-white/60"
        onLayout={onFrameLayout}
      >
        {showPhoto ? (
          <Image
            source={{ uri: uri! }}
            accessibilityLabel={category.label}
            style={styles.cardImage}
            resizeMode="contain"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <EmojiFallback emoji={emoji} fontSize={emojiSize} style={styles.cardFallback} />
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
  const imageStyle: ImageStyle = { width: dimension, height: dimension };
  const fixedEmojiSize = getEmojiFontSize(size, dimension);

  if (showPhoto) {
    return (
      <View style={frameStyle} className="bg-white">
        <Image
          source={{ uri: uri! }}
          accessibilityLabel={category.label}
          style={imageStyle}
          resizeMode="cover"
          onError={() => setLoadFailed(true)}
        />
      </View>
    );
  }

  return (
    <View style={frameStyle} className="items-center justify-center bg-primary-light/50">
      <Text style={{ fontSize: fixedEmojiSize, lineHeight: fixedEmojiSize * 1.05 }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroFrame: {
    width: '100%',
    aspectRatio: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7F9F8',
  },
  cardFrame: {
    width: '100%',
    aspectRatio: CARD_ASPECT,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    width: '100%',
    height: '100%',
  },
  emojiFallback: {
    width: '100%',
    height: '100%',
  },
});
