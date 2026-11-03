import * as React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { errorText } from '@/lib/validation';

type Props<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  multiline?: boolean;
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChangeText' | 'onBlur'>;

// Поле формы: подпись, ввод, текст ошибки. Связано с react-hook-form.
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  multiline,
  ...input
}: Props<T>) {
  const { t } = useTranslation();
  const Field = multiline ? Textarea : Input;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => (
        <View className="gap-1.5">
          <Label nativeID={`${name}-label`}>{label}</Label>
          <Field
            aria-labelledby={`${name}-label`}
            aria-invalid={!!error}
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            {...input}
          />
          {error ? (
            <Text className="text-sm text-destructive">{errorText(t, error.message)}</Text>
          ) : null}
        </View>
      )}
    />
  );
}
