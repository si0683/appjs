import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { toast } from 'sonner-native';

import { FormField } from '@/components/app/form-field';
import { ProviderButtons } from '@/components/app/provider-buttons';
import { Screen } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { tap } from '@/lib/haptics';
import {
  normalizePhone,
  phoneSchema,
  signInSchema,
  type PhoneValues,
  type SignInValues,
} from '@/lib/validation';
import { useAuth, type Provider } from '@/stores/auth';

// Вход и регистрация (модальное окно снизу): почта и пароль, телефон с кодом
// по SMS, Google / Apple / Яндекс ID / VK ID. Показываются только включённые
// способы — их сообщает src/stores/auth.ts (у своего сервера — по ключам в .env).
export default function SignInScreen() {
  const { t } = useTranslation();
  const auth = useAuth();
  const methods = useQuery({ queryKey: ['auth-methods', auth.mode], queryFn: auth.methods });
  const [tab, setTab] = React.useState<'email' | 'phone'>('email');
  const [busy, setBusy] = React.useState<Provider | null>(null);

  const done = () => {
    tap('success');
    toast.success(t('auth.welcome'));
    router.back();
  };
  const fail = (e: unknown) => {
    tap('warning');
    toast.error(t('auth.error', { message: (e as Error).message }));
  };

  const withProvider = async (p: Provider) => {
    setBusy(p);
    try {
      await auth.signInWith(p);
      if (useAuth.getState().user) done();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const m = methods.data;
  const showTabs = m?.email && m?.phone;

  return (
    <Screen className="gap-5 pt-6">
      <Stack.Screen options={{ title: t('auth.title') }} />
      {showTabs ? (
        <ToggleGroup
          type="single"
          variant="outline"
          className="w-full"
          value={tab}
          onValueChange={(v) => v && setTab(v as 'email' | 'phone')}>
          <ToggleGroupItem value="email" aria-label={t('auth.byEmail')} className="flex-1">
            <Text>{t('auth.byEmail')}</Text>
          </ToggleGroupItem>
          <ToggleGroupItem value="phone" aria-label={t('auth.byPhone')} className="flex-1">
            <Text>{t('auth.byPhone')}</Text>
          </ToggleGroupItem>
        </ToggleGroup>
      ) : null}

      {tab === 'phone' && m?.phone ? (
        <PhoneForm onDone={done} onFail={fail} />
      ) : m?.email !== false ? (
        <EmailForm onDone={done} onFail={fail} />
      ) : null}

      {m && (m.google || m.apple || m.yandex || m.vk) ? (
        <>
          <View className="flex-row items-center gap-3">
            <Separator className="flex-1" />
            <Text variant="muted" className="text-xs">
              {t('auth.or')}
            </Text>
            <Separator className="flex-1" />
          </View>
          <ProviderButtons methods={m} busy={busy} onPress={(p) => void withProvider(p)} />
        </>
      ) : null}
      {methods.isPending ? <ActivityIndicator /> : null}
    </Screen>
  );
}

function EmailForm({ onDone, onFail }: { onDone: () => void; onFail: (e: unknown) => void }) {
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
      onDone();
    } catch (e) {
      onFail(e);
    }
  });

  return (
    <View className="gap-5">
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
      <Pressable onPress={() => setSignUp((v) => !v)} className="items-center py-1">
        <Text className="text-sm text-primary">
          {t(isSignUp ? 'auth.toSignIn' : 'auth.toSignUp')}
        </Text>
      </Pressable>
    </View>
  );
}

const RESEND_SECONDS = 60;

function PhoneForm({ onDone, onFail }: { onDone: () => void; onFail: (e: unknown) => void }) {
  const { t } = useTranslation();
  const { sendPhoneCode, verifyPhoneCode, mode } = useAuth();
  const [phone, setPhone] = React.useState<string | null>(null);
  const [code, setCode] = React.useState('');
  const [left, setLeft] = React.useState(0);
  const [verifying, setVerifying] = React.useState(false);
  const { control, handleSubmit, formState } = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });

  React.useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const send = async (number: string) => {
    try {
      await sendPhoneCode(number);
      setPhone(number);
      setLeft(RESEND_SECONDS);
    } catch (e) {
      onFail(e);
    }
  };
  const onRequest = handleSubmit(async (values) => send(normalizePhone(values.phone)));

  const verify = async (value: string) => {
    if (!phone || value.length < 6) return;
    setVerifying(true);
    try {
      await verifyPhoneCode(phone, value);
      onDone();
    } catch (e) {
      onFail(e);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  if (!phone) {
    return (
      <View className="gap-5">
        <FormField
          control={control}
          name="phone"
          label={t('auth.phone')}
          placeholder="+7 999 123-45-67"
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          onSubmitEditing={() => void onRequest()}
        />
        <Button onPress={() => void onRequest()} disabled={formState.isSubmitting}>
          {formState.isSubmitting ? <ActivityIndicator color="white" /> : null}
          <Text>{t('auth.getCode')}</Text>
        </Button>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <Text className="text-muted-foreground">{t('auth.codeSent', { phone })}</Text>
      {mode === 'demo' ? (
        <Text className="text-xs text-muted-foreground">{t('auth.demoCode')}</Text>
      ) : null}
      <View className="gap-1.5">
        <Label nativeID="sms-code">{t('auth.code')}</Label>
        <Input
          aria-labelledby="sms-code"
          value={code}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, 6);
            setCode(digits);
            if (digits.length === 6) void verify(digits);
          }}
          keyboardType="number-pad"
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          maxLength={6}
          className="text-center text-2xl tracking-[8px]"
          autoFocus
        />
      </View>
      <Button onPress={() => void verify(code)} disabled={verifying || code.length < 6}>
        {verifying ? <ActivityIndicator color="white" /> : null}
        <Text>{t('auth.submit')}</Text>
      </Button>
      <View className="flex-row justify-between">
        <Pressable onPress={() => setPhone(null)} hitSlop={8}>
          <Text className="text-sm text-primary">{t('auth.changePhone')}</Text>
        </Pressable>
        {left > 0 ? (
          <Text variant="muted" className="text-sm">
            {t('auth.resendIn', { seconds: left })}
          </Text>
        ) : (
          <Pressable onPress={() => void send(phone)} hitSlop={8}>
            <Text className="text-sm text-primary">{t('auth.resend')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
