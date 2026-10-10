import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProductImageViewerProps {
  urls: string[];
  name: string;
  resizeMode: 'contain' | 'cover';
  initialIndex?: number;
  onClose: () => void;
}

export function ProductImageViewer({
  urls,
  name,
  resizeMode,
  initialIndex = 0,
  onClose,
}: ProductImageViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);
  const imageHeight = Math.max(240, height - insets.top - insets.bottom - 96);

  useEffect(() => {
    const start = Math.max(0, Math.min(initialIndex, urls.length - 1));
    setIndex(start);
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ x: start * width, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialIndex, urls.length, width]);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(next, urls.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: true });
    setIndex(clamped);
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black/95">
        <View
          className="flex-row items-center justify-between px-3"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Text className="flex-1 pr-3 text-sm font-bold text-white" numberOfLines={1}>
            {urls.length > 1 ? `${index + 1} / ${urls.length}` : name}
          </Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close photos"
            hitSlop={12}
            className="rounded-full bg-white/15 p-2"
          >
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
            const clamped = Math.max(0, Math.min(next, urls.length - 1));
            setIndex((current) => (current === clamped ? current : clamped));
          }}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / Math.max(width, 1));
            setIndex(Math.max(0, Math.min(next, urls.length - 1)));
          }}
        >
          {urls.map((url, urlIndex) => (
            <View
              key={`${url}-${urlIndex}`}
              style={{ width, height: imageHeight }}
              className="items-center justify-center"
            >
              <Image
                source={{ uri: url }}
                accessibilityLabel={name}
                style={{ width, height: imageHeight }}
                resizeMode={resizeMode}
              />
            </View>
          ))}
        </ScrollView>

        {urls.length > 1 ? (
          <View
            className="absolute left-0 right-0 flex-row items-center justify-between px-2"
            style={{ top: insets.top + imageHeight / 2 }}
            pointerEvents="box-none"
          >
            <Pressable
              onPress={() => goTo(index - 1)}
              disabled={index === 0}
              accessibilityLabel="Previous photo"
              className="rounded-full bg-black/50 p-2"
              style={{ opacity: index === 0 ? 0.35 : 1 }}
            >
              <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => goTo(index + 1)}
              disabled={index === urls.length - 1}
              accessibilityLabel="Next photo"
              className="rounded-full bg-black/50 p-2"
              style={{ opacity: index === urls.length - 1 ? 0.35 : 1 }}
            >
              <Ionicons name="chevron-forward" size={28} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
