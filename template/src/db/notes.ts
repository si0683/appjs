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
  add: async (note: NewNote) => {
    await getDb().insert(notes).values(note);
  },
  toggle: async (id: number, done: boolean) => {
    await getDb().update(notes).set({ done }).where(eq(notes.id, id));
  },
  update: async (id: number, data: Partial<NewNote>) => {
    await getDb().update(notes).set(data).where(eq(notes.id, id));
  },
  remove: async (id: number) => {
    await getDb().delete(notes).where(eq(notes.id, id));
  },
};
