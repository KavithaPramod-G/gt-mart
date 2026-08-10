import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';

import { cn } from '@/utils/cn';

interface SearchInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  inputClassName?: string;
}

export function SearchInput({
  value,
  onChangeText,
  inputClassName,
  ...rest
}: SearchInputProps) {
  const showClear = value.length > 0;

  return (
    <View className="relative">
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        className={cn('rounded-xl px-4 py-2.5 pr-10 text-[15px] text-foreground', inputClassName)}
      />
      {showClear ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          className="absolute bottom-0 right-3 top-0 justify-center"
        >
          <Ionicons name="close-circle" size={20} color="#5C6B63" />
        </Pressable>
      ) : null}
    </View>
  );
}
