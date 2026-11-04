import { PortalHost } from '@rn-primitives/portal';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import * as React from 'react';
import { AppState, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toaster } from 'sonner-native';
import { Uniwind, useUniwind } from 'uniwind';

import i18n, { applyDirection } from '@/i18n';
import { queryClient } from '@/lib/api';
import { NAV_THEME } from '@/lib/theme';
import { useSettings } from '@/stores/settings';

// Когда приложение возвращается из фона — React Query обновит устаревшие данные.
function useAppFocus() {
  React.useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (status) =>
      focusManager.setFocused(status === 'active')
    );
    return () => sub.remove();
  }, []);
}

// Тема и язык из настроек применяются ко всему приложению.
function useSettingsSync() {
  const theme = useSettings((s) => s.theme);
  const language = useSettings((s) => s.language);
  React.useEffect(() => Uniwind.setTheme(theme), [theme]);
  React.useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
    // Арабский, иврит и т. п. — зеркальный интерфейс (на телефоне — с перезапуском)
    void applyDirection(language);
  }, [language]);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useAppFocus();
  useSettingsSync();
  const { theme } = useUniwind();
  const scheme = theme === 'dark' ? 'dark' : 'light';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={NAV_THEME[scheme]}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          {children}
          <Toaster theme={scheme} richColors position="top-center" />
          <PortalHost />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
