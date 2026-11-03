import { Tabs } from 'expo-router';
import { CandlestickChart, House, NotebookPen, Settings, Wallet } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { tap } from '@/lib/haptics';

// Нижние вкладки. Иконки — Lucide (lucide.dev), любую можно взять по имени.
export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs screenListeners={{ tabPress: () => tap() }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: t('tabs.market'),
          tabBarIcon: ({ color, size }) => <CandlestickChart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: t('tabs.portfolio'),
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notes"
        options={{
          title: t('tabs.notes'),
          tabBarIcon: ({ color, size }) => <NotebookPen color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
