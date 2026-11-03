import type { LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

// Пустой список, ошибка, «ничего не найдено» — одинаково на всех экранах.
export function EmptyState({
  icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 p-8">
      <View className="rounded-full bg-muted p-4">
        <Icon as={icon} className="size-8 text-muted-foreground" />
      </View>
      <Text variant="large" className="text-center">
        {title}
      </Text>
      {hint ? <Text className="text-center text-muted-foreground">{hint}</Text> : null}
      {children}
    </View>
  );
}
