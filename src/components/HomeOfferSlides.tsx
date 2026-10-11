import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { useCombos } from '@/context/CombosContext';
import { useDiscountDeals } from '@/hooks/useDiscountDeals';
import { fetchActiveAnnouncements } from '@/services/api/announcementsApi';
import { fetchBogoProducts } from '@/services/api/productsApi';
import { ShopAnnouncement } from '@/types';

type SlideKind = 'deals' | 'bogo' | 'combo' | 'announcement';

interface OfferSlide {
  id: string;
  kind: SlideKind;
  badge: string;
  title: string;
  subtitle: string;
  emoji: string;
  imageUrl?: string | null;
  background: string;
  chip: string;
  cta: string;
  open: () => void;
}

const SLIDE_HEIGHT = 188;
/** Phone content width is the screen minus 32px padding. 16:9 fills that card. */
const SLIDE_ASPECT = 9 / 16;

const KIND_STYLE: Record<SlideKind, { background: string; chip: string }> = {
  deals: { background: '#C2410C', chip: '#FFF7ED' },
  bogo: { background: '#1B7A4E', chip: '#ECFDF3' },
  combo: { background: '#145C3A', chip: '#ECFDF3' },
  announcement: { background: '#1E3A5F', chip: '#EFF6FF' },
};

export function HomeOfferSlides() {
  const { count: dealCount, maxDiscountPercent } = useDiscountDeals();
  const { combos } = useCombos();
  const [announcements, setAnnouncements] = useState<ShopAnnouncement[]>([]);
  const [bogoCount, setBogoCount] = useState(0);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchActiveAnnouncements().then((rows) => {
      if (!cancelled) setAnnouncements(rows);
    });
    void fetchBogoProducts().then((rows) => {
      if (!cancelled) setBogoCount(rows?.length ?? 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = useMemo(() => {
    const next: OfferSlide[] = [];

    if (dealCount > 0) {
      next.push({
        id: 'deals',
        kind: 'deals',
        badge: "Today's deals",
        title: maxDiscountPercent > 0 ? `Up to ${maxDiscountPercent}% off` : 'Discounted items',
        subtitle: `${dealCount} product${dealCount === 1 ? '' : 's'} on offer`,
        emoji: '🏷️',
        ...KIND_STYLE.deals,
        cta: 'See products →',
        open: () => router.push('/deals'),
      });
    }

    if (bogoCount > 0) {
      next.push({
        id: 'bogo',
        kind: 'bogo',
        badge: 'Buy 1 Get 1',
        title: 'Buy one, get one',
        subtitle: `${bogoCount} product${bogoCount === 1 ? '' : 's'} in this offer`,
        emoji: '🎁',
        ...KIND_STYLE.bogo,
        cta: 'See products →',
        open: () => router.push('/offer/bogo'),
      });
    }

    for (const combo of combos.slice(0, 6)) {
      const save =
        combo.savePercent > 0 ? `Save ${combo.savePercent}%` : 'Combo pack';
      next.push({
        id: `combo-${combo.id}`,
        kind: 'combo',
        badge: combo.eventTag || 'Combo offer',
        title: combo.title,
        subtitle: `${combo.items.length} items · ${save}`,
        emoji: combo.emoji || '🧺',
        ...KIND_STYLE.combo,
        cta: 'See products →',
        open: () =>
          router.push({ pathname: '/combo/[id]', params: { id: combo.id } }),
      });
    }

    for (const announcement of announcements) {
      next.push({
        id: `news-${announcement.id}`,
        kind: 'announcement',
        badge: announcement.badge || (announcement.kind === 'offer' ? 'Offer' : 'News'),
        title: announcement.title,
        subtitle: announcement.subtitle || 'Tap to open',
        emoji: announcement.emoji || '📢',
        imageUrl: announcement.imageUrl,
        ...KIND_STYLE.announcement,
        cta: announcement.categoryId ? 'See products →' : 'Read →',
        open: () =>
          router.push({ pathname: '/announcement/[id]', params: { id: announcement.id } }),
      });
    }

    return next;
  }, [announcements, bogoCount, combos, dealCount, maxDiscountPercent]);

  const cardWidth = width > 480 ? 420 : width;
  const gap = width > cardWidth ? 12 : 0;
  const stride = cardWidth + gap;
  const slideHeight = cardWidth > 0 ? Math.round(cardWidth * SLIDE_ASPECT) : SLIDE_HEIGHT;

  useEffect(() => {
    if (slides.length < 2 || stride <= 0) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => {
        const nextIndex = (current + 1) % slides.length;
        scroller.current?.scrollTo({ x: nextIndex * stride, animated: true });
        return nextIndex;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length, stride]);

  if (slides.length === 0) return null;

  return (
    <View className="mb-5">
      <Text className="mb-2 text-base font-bold text-foreground">Offers & news</Text>
      <View
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          if (nextWidth > 0 && nextWidth !== width) setWidth(nextWidth);
        }}
      >
        {width > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled={gap === 0}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            style={{ height: slideHeight }}
            decelerationRate="fast"
            snapToInterval={stride}
            snapToAlignment="start"
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(event.nativeEvent.contentOffset.x / stride);
              setIndex(Math.min(slides.length - 1, Math.max(0, nextIndex)));
            }}
          >
            {slides.map((slide, slideIndex) => (
              <Pressable
                key={slide.id}
                onPress={slide.open}
                accessibilityRole="button"
                accessibilityLabel={`${slide.badge}. ${slide.title}`}
                style={{
                  width: cardWidth,
                  height: slideHeight,
                  overflow: 'hidden',
                  backgroundColor: slide.imageUrl ? '#111111' : slide.background,
                  marginRight: slideIndex === slides.length - 1 ? 0 : gap,
                }}
                className="rounded-3xl active:opacity-95"
              >
                {slide.imageUrl ? (
                  <>
                    <Image
                      source={{ uri: slide.imageUrl }}
                      resizeMode="cover"
                      style={{ width: cardWidth, height: slideHeight }}
                      accessibilityIgnoresInvertColors
                    />
                    <View className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1">
                      <Text className="text-[11px] font-bold uppercase tracking-wide text-white">
                        {slide.badge}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View
                      className="absolute -right-6 -top-8 h-36 w-36 rounded-full"
                      style={{ backgroundColor: 'rgba(255,255,255,0.14)' }}
                    />
                    <Text className="absolute right-4 top-8 text-5xl">{slide.emoji}</Text>
                    <View className="flex-1 justify-between p-4 pr-20">
                      <View>
                        <View
                          className="self-start rounded-full px-2.5 py-1"
                          style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                        >
                          <Text className="text-[11px] font-bold uppercase tracking-wide text-white">
                            {slide.badge}
                          </Text>
                        </View>
                        <Text className="mt-2 text-[22px] font-extrabold text-white" numberOfLines={2}>
                          {slide.title}
                        </Text>
                        <Text className="mt-1 text-[13px] text-white/90" numberOfLines={2}>
                          {slide.subtitle}
                        </Text>
                      </View>
                      <View
                        className="self-start rounded-full px-3 py-1.5"
                        style={{ backgroundColor: slide.chip }}
                      >
                        <Text className="text-[13px] font-bold" style={{ color: slide.background }}>
                          {slide.cta}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={{ height: slideHeight }} />
        )}
      </View>
      {slides.length > 1 ? (
        <View className="mt-2 flex-row items-center justify-center gap-1.5">
          {slides.map((slide, dotIndex) => (
            <View
              key={slide.id}
              className="rounded-full"
              style={{
                width: dotIndex === index ? 16 : 6,
                height: 6,
                backgroundColor: dotIndex === index ? '#1B7A4E' : '#C5D1CB',
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
