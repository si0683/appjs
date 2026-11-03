import { DarkTheme, DefaultTheme, type Theme } from 'expo-router/react-navigation';

// Цвета для навигации (шапка, нижние вкладки). Держите в паре с src/global.css.
export const THEME = {
  light: {
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(0 0% 3.9%)',
    card: 'hsl(0 0% 100%)',
    border: 'hsl(0 0% 89.8%)',
    primary: 'hsl(262 83% 58%)',
    mutedForeground: 'hsl(0 0% 45.1%)',
    destructive: 'hsl(0 84.2% 60.2%)',
  },
  dark: {
    background: 'hsl(0 0% 3.9%)',
    foreground: 'hsl(0 0% 98%)',
    card: 'hsl(0 0% 7%)',
    border: 'hsl(0 0% 14.9%)',
    primary: 'hsl(258 90% 76%)',
    mutedForeground: 'hsl(0 0% 63.9%)',
    destructive: 'hsl(0 70.9% 59.4%)',
  },
};

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
