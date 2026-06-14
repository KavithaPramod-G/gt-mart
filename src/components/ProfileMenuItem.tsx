import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { cn } from '@/utils/cn';

interface ProfileMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: ReactNode;
  destructive?: boolean;
}

export function ProfileMenuItem({
  icon,
  label,
  subtitle,
  onPress,
  showChevron = true,
  rightElement,
  destructive = false,
}: ProfileMenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      className="flex-row items-center border-b border-border px-4 py-4 active:bg-background"
    >
      <View
        className={cn(
          'mr-3 h-10 w-10 items-center justify-center rounded-xl',
          destructive ? 'bg-red-50' : 'bg-primary-light',
        )}
      >
        <Ionicons
          name={icon}
          size={20}
          color={destructive ? '#D64545' : '#1B7A4E'}
        />
      </View>

      <View className="flex-1">
        <Text
          className={cn(
            'text-base font-semibold',
            destructive ? 'text-error' : 'text-foreground',
          )}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-muted">{subtitle}</Text>
        ) : null}
      </View>

      {rightElement ?? (
        showChevron && onPress ? (
          <Ionicons name="chevron-forward" size={18} color="#5C6B63" />
        ) : null
      )}
    </Pressable>
  );
}
