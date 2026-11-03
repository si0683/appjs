import { Link, Redirect, Stack, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  // Веб-версия: /index.html — служебный адрес (см. src/db/client.ts), ведём на главную.
  if (usePathname() === '/index.html') return <Redirect href="/" />;

  return (
    <>
      <Stack.Screen options={{ title: '404' }} />
      <View className="flex-1 items-center justify-center gap-4 bg-background p-6">
        <Text variant="h3">{t('notFound.title')}</Text>
        <Link href="/" asChild>
          <Button>
            <Text>{t('notFound.back')}</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}
