import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';
import { toast } from 'sonner-native';

import { FormField } from '@/components/app/form-field';
import { Screen } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { tap } from '@/lib/haptics';
import { signInSchema, type SignInValues } from '@/lib/validation';
import { useAuth } from '@/stores/auth';

// Экран входа открывается снизу как модальное окно (см. src/app/_layout.tsx).
export default function SignInScreen() {
  const { t } = useTranslation();
  const signIn = useAuth((s) => s.signIn);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    await signIn(email, password);
    tap('success');
    toast.success(t('auth.welcome'));
    router.back();
  });

  return (
    <Screen className="gap-5 pt-6">
      <Text className="text-muted-foreground">{t('auth.lead')}</Text>
      <FormField
        control={control}
        name="email"
        label={t('auth.email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <FormField
        control={control}
        name="password"
        label={t('auth.password')}
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={() => void onSubmit()}
      />
      <Button onPress={() => void onSubmit()} disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <ActivityIndicator color="white" /> : null}
        <Text>{t('auth.submit')}</Text>
      </Button>
    </Screen>
  );
}
