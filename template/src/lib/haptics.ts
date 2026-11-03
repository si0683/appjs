import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useSettings } from '@/stores/settings';

// Короткая вибрация. Учитывает настройку пользователя и молчит в браузере.
export function tap(kind: 'light' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web' || !useSettings.getState().haptics) return;
  if (kind === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  else
    void Haptics.notificationAsync(
      kind === 'success'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
}
