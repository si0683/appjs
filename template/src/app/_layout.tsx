import '@/global.css';

import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Providers } from '@/components/app/providers';
import { Text } from '@/components/ui/text';
import { useDatabase } from '@/db/client';
import { i18nReady } from '@/i18n';

export { ErrorBoundary } from 'expo-router';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Перед первым экраном применяем миграции базы, потом убираем заставку.
  const { success, error } = useDatabase();
  // Переводы языка телефона подгружаются до первого экрана
  const [i18nOk, setI18nOk] = React.useState(false);
  React.useEffect(() => {
    void i18nReady.then(() => setI18nOk(true));
  }, []);
  React.useEffect(() => {
    if (success || error) void SplashScreen.hideAsync();
  }, [success, error]);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-destructive">{error.message}</Text>
      </View>
    );
  }
  if (!success || !i18nOk) return null;

  return (
    <Providers>
      <RootStack />
    </Providers>
  );
}

function RootStack() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="note/[id]" options={{ title: '' }} />
      <Stack.Screen name="market/[symbol]" options={{ title: '' }} />
      <Stack.Screen name="calculator" options={{ presentation: 'modal', title: t('calc.title') }} />
      <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: t('auth.title') }} />
    </Stack>
  );
}
