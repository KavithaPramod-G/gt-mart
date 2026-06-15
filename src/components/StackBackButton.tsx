import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Platform } from 'react-native';

interface StackBackButtonProps {
  /** Route when there is no history (e.g. after browser refresh). */
  fallbackHref?: '/(tabs)' | '/(tabs)/index';
  accessibilityLabel?: string;
}

export function StackBackButton({
  fallbackHref = '/(tabs)',
  accessibilityLabel = 'Go back',
}: StackBackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={12}
      className="px-2 py-1"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Ionicons
        name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
        size={24}
        color="#FFFFFF"
      />
    </Pressable>
  );
}
