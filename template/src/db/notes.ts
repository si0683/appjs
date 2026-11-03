import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { getDb } from './client';
import { notes, type NewNote } from './schema';

// Все запросы к заметкам — в одном месте. Экраны не пишут SQL сами.
export function useNotes() {
  return useLiveQuery(getDb().select().from(notes).orderBy(desc(notes.createdAt), desc(notes.id)));
}

export function useNote(id: number) {
  return useLiveQuery(getDb().select().from(notes).where(eq(notes.id, id)), [id]);
}

export const notesRepo = {
  add: (note: NewNote) => getDb().insert(notes).values(note),
  toggle: (id: number, done: boolean) =>
    getDb().update(notes).set({ done }).where(eq(notes.id, id)),
  update: (id: number, data: Partial<NewNote>) =>
    getDb().update(notes).set(data).where(eq(notes.id, id)),
  remove: (id: number) => getDb().delete(notes).where(eq(notes.id, id)),
};
