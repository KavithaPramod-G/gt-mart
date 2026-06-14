import { Text, View } from 'react-native';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
}

export function EmptyState({ emoji, title, description }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="mb-4 text-5xl">{emoji}</Text>
      <Text className="mb-2 text-center text-xl font-bold text-foreground">{title}</Text>
      <Text className="text-center text-base leading-6 text-muted">{description}</Text>
    </View>
  );
}
