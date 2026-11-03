import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/app/screen';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LANGUAGES, type Language } from '@/i18n';
import { tap } from '@/lib/haptics';
import { useAuth } from '@/stores/auth';
import { useSettings, type ThemeChoice } from '@/stores/settings';

const THEMES: {
  value: ThemeChoice;
  icon: LucideIcon;
  label: 'themeSystem' | 'themeLight' | 'themeDark';
}[] = [
  { value: 'system', icon: Monitor, label: 'themeSystem' },
  { value: 'light', icon: Sun, label: 'themeLight' },
  { value: 'dark', icon: Moon, label: 'themeDark' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettings();
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <Section title={t('settings.theme')}>
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={settings.theme}
          onValueChange={(value) => {
            if (!value) return;
            tap();
            settings.setTheme(value as ThemeChoice);
          }}>
          {THEMES.map(({ value, icon, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={t(`settings.${label}`)}
              className="flex-1 gap-1.5">
              <Icon as={icon} className="size-4" />
              <Text className="text-xs">{t(`settings.${label}`)}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Section>

      <Section title={t('settings.language')}>
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={settings.language}
          onValueChange={(value) => {
            if (!value) return;
            tap();
            settings.setLanguage(value as Language);
          }}>
          {Object.entries(LANGUAGES).map(([code, { label }]) => (
            <ToggleGroupItem key={code} value={code} aria-label={label} className="flex-1">
              <Text>{label}</Text>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <View className="flex-row items-center justify-between pt-2">
          <Label nativeID="haptics" onPress={() => settings.setHaptics(!settings.haptics)}>
            {t('settings.haptics')}
          </Label>
          <Switch
            aria-labelledby="haptics"
            checked={settings.haptics}
            onCheckedChange={settings.setHaptics}
          />
        </View>
      </Section>

      <Section title={t('settings.account')}>
        {user ? (
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <Avatar alt={user.name} className="size-10">
                <AvatarFallback>
                  <Text>{user.name.slice(0, 2).toUpperCase()}</Text>
                </AvatarFallback>
              </Avatar>
              <Text className="flex-1">{t('settings.signedInAs', { email: user.email })}</Text>
            </View>
            <Button variant="outline" onPress={signOut}>
              <Icon as={LogOut} />
              <Text>{t('settings.signOut')}</Text>
            </Button>
          </View>
        ) : (
          <View className="gap-4">
            <Text className="text-muted-foreground">{t('settings.guest')}</Text>
            <Link href="/sign-in" asChild>
              <Button>
                <Text>{t('settings.signIn')}</Text>
              </Button>
            </Link>
          </View>
        )}
      </Section>

      <Text variant="muted" className="text-center">
        {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </Text>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="gap-2 px-4">{children}</CardContent>
    </Card>
  );
}
