import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SearchX, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { EmptyState } from '@/components/app/empty-state';
import { Screen } from '@/components/app/screen';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { notesRepo, useNote } from '@/db/notes';
import { tap } from '@/lib/haptics';

// Экран по адресу /note/5 — параметр берётся из имени файла [id].tsx.
export default function NoteScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useNote(Number(id));
  const note = data[0];

  if (!note) return <EmptyState icon={SearchX} title={t('notes.notFound')} />;

  return (
    <Screen>
      <Stack.Screen options={{ title: note.title }} />
      <View className="flex-row items-center gap-2">
        {note.done ? (
          <Badge>
            <Text>{t('notes.done')}</Text>
          </Badge>
        ) : null}
        <Text variant="muted">{note.createdAt.toLocaleString(i18n.language)}</Text>
      </View>
      <Text variant="h3">{note.title}</Text>
      {note.body ? <Text className="leading-6">{note.body}</Text> : null}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="mt-6">
            <Icon as={Trash2} className="text-white" />
            <Text>{t('notes.delete')}</Text>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notes.deleteAsk')}</AlertDialogTitle>
            <AlertDialogDescription>{t('notes.deleteHint')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>{t('notes.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={async () => {
                tap('warning');
                await notesRepo.remove(note.id);
                router.back();
              }}>
              <Text>{t('notes.delete')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
