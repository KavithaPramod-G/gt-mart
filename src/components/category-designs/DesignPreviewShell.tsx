import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface DesignPreviewShellProps {
  title: string;
  subtitle: string;
  badge: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function DesignPreviewShell({
  title,
  subtitle,
  badge,
  children,
  footer,
}: DesignPreviewShellProps) {
  return (
    <View className="mb-8 overflow-hidden rounded-3xl border border-border bg-background">
      <View className="border-b border-border bg-surface px-4 py-3">
        <View className="mb-1 flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">{title}</Text>
          <View className="rounded-full bg-accent/15 px-2.5 py-1">
            <Text className="text-[11px] font-bold text-accent">{badge}</Text>
          </View>
        </View>
        <Text className="text-sm text-muted">{subtitle}</Text>
      </View>

      <View className="bg-background p-3">
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          <View className="bg-primary px-4 py-3">
            <Text className="text-lg font-bold text-white">GT Mart</Text>
            <View className="mt-2 rounded-xl bg-white/95 px-3 py-2">
              <Text className="text-sm text-muted">Search groceries...</Text>
            </View>
          </View>
          <View className="p-3">{children}</View>
          {footer ? <View className="border-t border-border px-3 py-3">{footer}</View> : null}
        </View>
      </View>
    </View>
  );
}
