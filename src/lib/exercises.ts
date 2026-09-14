import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type ExerciseType } from '../db';
import { ValidationError } from './errors';

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

export function normalizeNote(note: string) {
  return note.trim();
}

/** Forme de comparaison : sans accents ni majuscules. */
export function foldName(name: string) {
  return normalizeName(name).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function sortByName<T extends { name: string }>(list: T[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

async function assertNameAvailable(name: string, exceptId?: number) {
  const folded = foldName(name);
  const exercises = await db.exercises.toArray();
  if (exercises.some((e) => e.id !== exceptId && foldName(e.name) === folded)) {
    throw new ValidationError(`L'exercice « ${name} » existe déjà.`);
  }
}

export async function createExercise(name: string, type: ExerciseType) {
  const clean = normalizeName(name);
  if (!clean) throw new ValidationError("Le nom de l'exercice est obligatoire.");
  await assertNameAvailable(clean);
  return db.exercises.add({ name: clean, type });
}

export async function updateExercise(id: number, name: string, type: ExerciseType, note: string) {
  const clean = normalizeName(name);
  if (!clean) throw new ValidationError("Le nom de l'exercice est obligatoire.");
  await assertNameAvailable(clean, id);
  await db.exercises.update(id, { name: clean, type, note: normalizeNote(note) });
}

export function useExerciseMap() {
  return useLiveQuery(async () => new Map<number, Exercise>((await db.exercises.toArray()).map((e) => [e.id, e])), []);
}
