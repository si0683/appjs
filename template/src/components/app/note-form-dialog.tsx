import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { toast } from 'sonner-native';

import { FormField } from '@/components/app/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { notesRepo } from '@/db/notes';
import { tap } from '@/lib/haptics';
import { noteSchema, type NoteValues } from '@/lib/validation';

// Окно «Новая заметка»: форма с проверкой (zod) и запись в локальную базу.
export function NoteFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { control, handleSubmit, reset, formState } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', body: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await notesRepo.add(values);
    tap('success');
    toast.success(t('notes.saved'));
    reset();
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[340px] max-w-full">
        <DialogHeader>
          <DialogTitle>{t('notes.newTitle')}</DialogTitle>
        </DialogHeader>
        <View className="gap-4">
          <FormField control={control} name="title" label={t('notes.title')} autoFocus />
          <FormField control={control} name="body" label={t('notes.body')} multiline />
        </View>
        <DialogFooter>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>{t('notes.cancel')}</Text>
          </Button>
          <Button onPress={() => void onSubmit()} disabled={formState.isSubmitting}>
            <Text>{t('notes.save')}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
