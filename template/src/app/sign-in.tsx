import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable } from 'react-native';
import { toast } from 'sonner-native';

import { FormField } from '@/components/app/form-field';
import { Screen } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { tap } from '@/lib/haptics';
import { signInSchema, type SignInValues } from '@/lib/validation';
import { useAuth } from '@/stores/auth';

// Вход и регистрация (модальное окно снизу, см. src/app/_layout.tsx).
// Откуда берутся аккаунты — решает src/stores/auth.ts (демо / свой сервер / Supabase).
export default function SignInScreen() {
  const { t } = useTranslation();
  const { signIn, signUp, mode } = useAuth();
  const [isSignUp, setSignUp] = React.useState(false);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    try {
      await (isSignUp ? signUp : signIn)(email, password);
      tap('success');
      toast.success(t('auth.welcome'));
      router.back();
    } catch (e) {
      tap('warning');
      toast.error(t('auth.error', { message: (e as Error).message }));
    }
  });

  return (
    <Screen className="gap-5 pt-6">
      <Stack.Screen options={{ title: t(isSignUp ? 'auth.titleSignUp' : 'auth.title') }} />
      {mode === 'demo' ? <Text className="text-muted-foreground">{t('auth.lead')}</Text> : null}
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
        autoComplete={isSignUp ? 'new-password' : 'password'}
        onSubmitEditing={() => void onSubmit()}
      />
      <Button onPress={() => void onSubmit()} disabled={formState.isSubmitting}>
        {formState.isSubmitting ? <ActivityIndicator color="white" /> : null}
        <Text>{t(isSignUp ? 'auth.signUp' : 'auth.submit')}</Text>
      </Button>
      <Pressable onPress={() => setSignUp((v) => !v)} className="items-center py-2">
        <Text className="text-sm text-primary">
          {t(isSignUp ? 'auth.toSignIn' : 'auth.toSignUp')}
        </Text>
      </Pressable>
    </Screen>
  );
}
