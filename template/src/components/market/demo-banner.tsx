import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useMarketSource } from '@/features/market';

/** Полоска «биржа недоступна — демо-данные» с кнопкой «Повторить». */
export function DemoBanner() {
  const { t } = useTranslation();
  const { fallback, retry } = useMarketSource();
  if (!fallback) return null;
  return (
    <View className="flex-row items-center gap-3 bg-chart-3/15 px-4 py-2">
      <Text className="flex-1 text-xs">{t('market.demo')}</Text>
      <Pressable onPress={retry} hitSlop={8}>
        <Text className="text-xs font-semibold text-primary">{t('market.retry')}</Text>
      </Pressable>
    </View>
  );
}
