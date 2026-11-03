import { Link } from 'expo-router';
import {
  Database,
  FormInput,
  Languages,
  LayoutGrid,
  RefreshCw,
  Route,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { toast } from 'sonner-native';

import { Screen } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { tap } from '@/lib/haptics';
import { useAuth } from '@/stores/auth';

type StackKey = 'router' | 'ui' | 'data' | 'db' | 'forms' | 'i18n';

const STACK: { key: StackKey; icon: LucideIcon }[] = [
  { key: 'router', icon: Route },
  { key: 'ui', icon: LayoutGrid },
  { key: 'data', icon: RefreshCw },
  { key: 'db', icon: Database },
  { key: 'forms', icon: FormInput },
  { key: 'i18n', icon: Languages },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const user = useAuth((s) => s.user);

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(400)} className="gap-2 pt-2">
        <Text variant="h3">
          {user ? t('home.helloName', { name: user.name }) : t('home.hello')}
        </Text>
        <Text className="text-muted-foreground">{t('home.lead')}</Text>
      </Animated.View>

      <Card>
        <CardHeader>
          <CardTitle>{t('home.stackTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          {STACK.map(({ key, icon }, i) => (
            <Animated.View
              key={key}
              entering={FadeInDown.delay(80 * (i + 1)).duration(350)}
              className="flex-row items-center gap-3">
              <View className="rounded-lg bg-primary/10 p-2">
                <Icon as={icon} className="size-4 text-primary" />
              </View>
              <Text className="flex-1">{t(`home.stack.${key}`)}</Text>
            </Animated.View>
          ))}
        </CardContent>
      </Card>

      <View className="gap-3">
        <Button
          onPress={() => {
            tap('success');
            toast.success(t('home.toastText'));
          }}>
          <Icon as={Sparkles} />
          <Text>{t('home.toast')}</Text>
        </Button>
        {!user ? (
          <Link href="/sign-in" asChild>
            <Button variant="outline">
              <Text>{t('home.signIn')}</Text>
            </Button>
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}
