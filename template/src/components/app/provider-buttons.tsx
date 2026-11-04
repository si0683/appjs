import * as AppleAuthentication from 'expo-apple-authentication';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { AuthMethods, Provider } from '@/stores/auth';

// Кнопки входа через Google, Apple, Яндекс ID, VK ID. Показываются только
// включённые (methods). На iOS Apple — нативная кнопка: так требуют правила Apple.

const BRAND: Record<Provider, { name: string; mark: string; bg: string; fg: string }> = {
  google: { name: 'Google', mark: 'G', bg: '#ffffff', fg: '#4285F4' },
  apple: { name: 'Apple', mark: '', bg: '#000000', fg: '#ffffff' },
  yandex: { name: 'Яндекс ID', mark: 'Я', bg: '#FC3F1D', fg: '#ffffff' },
  vk: { name: 'VK ID', mark: 'VK', bg: '#0077FF', fg: '#ffffff' },
};
const ORDER: Provider[] = ['apple', 'google', 'yandex', 'vk'];

export function ProviderButtons({
  methods,
  busy,
  onPress,
}: {
  methods: AuthMethods;
  busy: Provider | null;
  onPress: (provider: Provider) => void;
}) {
  const { t } = useTranslation();
  const { theme } = useUniwind();
  const [nativeApple, setNativeApple] = React.useState(false);
  React.useEffect(() => {
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setNativeApple);
  }, []);

  const list = ORDER.filter((p) => methods[p]);
  if (!list.length) return null;

  return (
    <View className="gap-3">
      {list.map((p) => {
        if (p === 'apple' && nativeApple) {
          return (
            <AppleAuthentication.AppleAuthenticationButton
              key={p}
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                theme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={8}
              style={{ height: 44 }}
              onPress={() => onPress(p)}
            />
          );
        }
        const b = BRAND[p];
        return (
          <Button
            key={p}
            variant="outline"
            disabled={busy !== null}
            onPress={() => onPress(p)}
            accessibilityLabel={t('auth.continueWith', { provider: b.name })}>
            {b.mark ? (
              <View
                className="size-6 items-center justify-center rounded-md border border-border"
                style={{ backgroundColor: b.bg }}>
                <Text className="text-xs font-bold" style={{ color: b.fg }}>
                  {b.mark}
                </Text>
              </View>
            ) : null}
            <Text>{busy === p ? '…' : t('auth.continueWith', { provider: b.name })}</Text>
          </Button>
        );
      })}
    </View>
  );
}
