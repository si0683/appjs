import * as React from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

import { cn } from '@/lib/utils';

// Обёртка экрана: фон темы, отступы, прокрутка. Шапку и нижние вкладки рисует навигация.
export function Screen({
  scroll = true,
  className,
  children,
  ...props
}: ScrollViewProps & { scroll?: boolean; className?: string }) {
  if (!scroll) return <View className={cn('flex-1 bg-background p-4', className)}>{children}</View>;
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName={cn('gap-4 p-4 pb-10', className)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      {...props}>
      {children}
    </ScrollView>
  );
}
