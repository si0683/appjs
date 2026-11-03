import { FlashList } from '@shopify/flash-list';
import { Link, Stack } from 'expo-router';
import { ChevronRight, NotebookPen, Plus } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/app/empty-state';
import { NoteFormDialog } from '@/components/app/note-form-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { notesRepo, useNotes } from '@/db/notes';
import type { Note } from '@/db/schema';
import { tap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

// Список заметок из локальной базы. useNotes() сам обновляет экран после изменений.
export default function NotesScreen() {
  const { t } = useTranslation();
  const { data } = useNotes();
  const [open, setOpen] = React.useState(false);

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button size="sm" variant="ghost" onPress={() => setOpen(true)} className="mr-2">
              <Icon as={Plus} className="text-primary" />
              <Text className="text-primary">{t('notes.add')}</Text>
            </Button>
          ),
        }}
      />
      {data.length === 0 ? (
        <EmptyState icon={NotebookPen} title={t('notes.empty')} hint={t('notes.emptyHint')}>
          <Button onPress={() => setOpen(true)}>
            <Icon as={Plus} />
            <Text>{t('notes.add')}</Text>
          </Button>
        </EmptyState>
      ) : (
        <FlashList
          data={data}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <Text variant="muted" className="mb-3">
              {t('notes.count', { count: data.length })}
            </Text>
          }
          renderItem={({ item }) => <NoteRow note={item} />}
        />
      )}
      <NoteFormDialog open={open} onOpenChange={setOpen} />
    </View>
  );
}

function Separator() {
  return <View className="h-2" />;
}

function NoteRow({ note }: { note: Note }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Checkbox
        checked={note.done}
        onCheckedChange={(done) => {
          tap();
          void notesRepo.toggle(note.id, done);
        }}
      />
      <Link href={{ pathname: '/note/[id]', params: { id: note.id } }} asChild>
        <Pressable className="flex-1 flex-row items-center gap-2 active:opacity-60">
          <View className="flex-1 gap-0.5">
            <Text
              className={cn('font-medium', note.done && 'text-muted-foreground line-through')}
              numberOfLines={1}>
              {note.title}
            </Text>
            {note.body ? (
              <Text variant="muted" numberOfLines={1}>
                {note.body}
              </Text>
            ) : null}
          </View>
          <Icon as={ChevronRight} className="size-4 text-muted-foreground" />
        </Pressable>
      </Link>
    </View>
  );
}
