import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Text, View, useWindowDimensions } from 'react-native';

import { CartDock, useCartDockInset } from '@/components/CartDock';
import { ProductGridList } from '@/components/ProductGridList';
import { StackBackButton } from '@/components/StackBackButton';
import { usePaginatedProducts } from '@/hooks/usePaginatedProducts';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchAnnouncementById, fetchAnnouncementProductIds } from '@/services/api/announcementsApi';
import { fetchProductsByIds } from '@/services/api/productsApi';
import { Product, ShopAnnouncement } from '@/types';

export default function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const cartDockInset = useCartDockInset();
  const [announcement, setAnnouncement] = useState<ShopAnnouncement | null>(null);
  const [isLoadingNotice, setIsLoadingNotice] = useState(true);
  const [posterAspect, setPosterAspect] = useState(4 / 3);
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const [linksLoaded, setLinksLoaded] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoadingNotice(false);
      return;
    }
    let cancelled = false;
    void fetchAnnouncementById(id).then((row) => {
      if (cancelled) return;
      setAnnouncement(row);
      setIsLoadingNotice(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const imageUrl = announcement?.imageUrl;
    if (!imageUrl) return undefined;
    let cancelled = false;
    Image.getSize(
      imageUrl,
      (imageWidth, imageHeight) => {
        if (cancelled || imageWidth <= 0 || imageHeight <= 0) return;
        setPosterAspect(imageHeight / imageWidth);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [announcement?.imageUrl]);

  useEffect(() => {
    const announcementId = announcement?.id;
    if (!announcementId) return undefined;
    let cancelled = false;
    setLinkedProducts([]);
    setLinksLoaded(false);
    void fetchAnnouncementProductIds(announcementId)
      .then((ids) => (ids.length > 0 ? fetchProductsByIds(ids) : []))
      .then((rows) => {
        if (cancelled) return;
        setLinkedProducts(rows);
        setLinksLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [announcement?.id]);

  const categoryId = announcement?.categoryId ?? null;
  const showLinked = linksLoaded && linkedProducts.length > 0;
  const { products, isLoading, isLoadingMore, hasMore, loadMore } = usePaginatedProducts({
    categoryId,
    enabled: Boolean(categoryId) && !showLinked && linksLoaded && isSupabaseConfigured(),
  });
  const listedProducts = showLinked ? linkedProducts : products;

  return (
    <>
      <Stack.Screen
        options={{
          title: announcement?.title ?? 'Announcement',
          headerLeft: () => (
            <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back to shop" />
          ),
        }}
      />
      <View className="flex-1 bg-background">
        {isLoadingNotice ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1B7A4E" />
          </View>
        ) : !announcement ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-muted">This announcement is not available.</Text>
          </View>
        ) : (
          <ProductGridList
            products={showLinked || categoryId ? listedProducts : []}
            showMrpRate
            isLoadingMore={isLoadingMore}
            hasMore={!showLinked && Boolean(categoryId) && hasMore}
            onEndReached={!showLinked && categoryId ? loadMore : undefined}
            ListHeaderComponent={
              <View className="px-4 pb-2 pt-4">
                {announcement.imageUrl ? (
                  <View className="overflow-hidden rounded-3xl bg-[#111111]">
                    <Image
                      source={{ uri: announcement.imageUrl }}
                      resizeMode="contain"
                      style={{ width: width - 32, height: Math.round((width - 32) * posterAspect) }}
                      accessibilityLabel={announcement.title}
                    />
                  </View>
                ) : (
                  <View className="rounded-3xl bg-[#1E3A5F] p-4">
                    <Text className="text-3xl">{announcement.emoji}</Text>
                    {announcement.badge ? (
                      <Text className="mt-2 text-[11px] font-bold uppercase tracking-wide text-white/80">
                        {announcement.badge}
                      </Text>
                    ) : null}
                    <Text className="mt-1 text-xl font-extrabold text-white">{announcement.title}</Text>
                    {announcement.subtitle ? (
                      <Text className="mt-1 text-sm text-white/90">{announcement.subtitle}</Text>
                    ) : null}
                  </View>
                )}
                {announcement.body ? (
                  <Text className="mt-3 text-sm leading-5 text-foreground">{announcement.body}</Text>
                ) : null}
                {showLinked || categoryId ? (
                  <Text className="mb-1 mt-4 text-base font-bold text-foreground">Related products</Text>
                ) : announcement.imageUrl ? null : (
                  <Text className="mt-4 text-sm text-muted">
                    This notice does not have a product list attached.
                  </Text>
                )}
                {(showLinked ? false : categoryId && isLoading && products.length === 0) ? (
                  <ActivityIndicator color="#1B7A4E" style={{ marginTop: 24 }} />
                ) : null}
              </View>
            }
            contentContainerStyle={{ paddingBottom: cartDockInset + 24 }}
          />
        )}
        <CartDock />
      </View>
    </>
  );
}
