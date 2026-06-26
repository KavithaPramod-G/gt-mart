import { useEffect, useState } from 'react';
import { Image, ImageStyle, LayoutChangeEvent, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { ShopCategory } from '@/types';

type CategoryImageSource = Pick<ShopCategory, 'emoji' | 'imageUrl' | 'label'>;

interface CategoryImageProps {
  category: CategoryImageSource;
  size?: 'md' | 'hero';
  /** Known frame width — scales emoji fallback to match photo cards */
  frameWidth?: number;
}

const MD_SIZE = 56;

function getEmojiFontSize(size: 'hero' | 'md', frameWidth: number): number {
  if (size === 'hero') {
    return Math.round(frameWidth * 0.58);
  }
  return 30;
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

  const frameStyle: ViewStyle = {
    width: MD_SIZE,
    height: MD_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  };
  const imageStyle: ImageStyle = { width: MD_SIZE, height: MD_SIZE };
  const fixedEmojiSize = getEmojiFontSize('md', MD_SIZE);

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
  emojiFallback: {
    width: '100%',
    height: '100%',
  },
});
