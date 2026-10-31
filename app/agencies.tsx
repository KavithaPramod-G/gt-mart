import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { StackBackButton } from '@/components/StackBackButton';
import { fetchAgencies, ShopAgency } from '@/services/api/agenciesApi';

export default function AgenciesScreen() {
  const [agencies, setAgencies] = useState<ShopAgency[]>([]);
  const [ready, setReady] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAgencies().then((result) => {
      if (!active) return;
      setReady(result.ready);
      setAgencies(result.agencies);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Agency order',
          headerLeft: () => <StackBackButton fallbackHref="/(tabs)" accessibilityLabel="Back to shop" />,
        }}
      />
      {loading ? (
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator color="#1B7A4E" />
        </View>
      ) : (
        <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text className="mb-4 text-sm text-muted">
            Pick an agency, then choose the item, the size, and how many pieces. Grocery products stay in the normal cart.
          </Text>
          {!ready ? (
            <Text className="text-sm text-muted">Agency lists are not available yet.</Text>
          ) : agencies.length === 0 ? (
            <Text className="text-sm text-muted">No agency lists yet.</Text>
          ) : (
            agencies.map((agency) => (
              <Pressable
                key={agency.id}
                onPress={() => router.push({ pathname: '/agency/[id]', params: { id: agency.id } })}
                className="mb-3 rounded-2xl border border-border bg-surface p-4"
              >
                <Text className="text-base font-bold text-foreground">{agency.label}</Text>
                {agency.blurb ? <Text className="mt-1 text-sm text-muted">{agency.blurb}</Text> : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </>
  );
}
