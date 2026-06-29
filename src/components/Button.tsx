import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  Text,
} from 'react-native';

import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'whatsapp' | 'outline';

interface ButtonProps extends Omit<PressableProps, 'style' | 'className'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
}

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-primary-light',
    text: 'text-primary',
  },
  whatsapp: {
    container: 'bg-whatsapp',
    text: 'text-white',
  },
  outline: {
    container: 'bg-surface border border-border',
    text: 'text-foreground',
  },
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const styles = variantClasses[variant];
  const isDisabled = Boolean(disabled || loading);
  const useMutedDisabledStyle =
    isDisabled && (variant === 'primary' || variant === 'whatsapp');

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'min-h-12 items-center justify-center rounded-xl px-4 active:opacity-85',
        useMutedDisabledStyle ? 'bg-primary-light' : styles.container,
        isDisabled && !useMutedDisabledStyle && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary' || useMutedDisabledStyle ? '#1B7A4E' : '#FFFFFF'
          }
        />
      ) : (
        <Text
          className={cn(
            'text-base font-semibold',
            useMutedDisabledStyle ? 'text-primary' : styles.text,
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
