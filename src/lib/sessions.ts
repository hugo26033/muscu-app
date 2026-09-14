import Dexie from 'dexie';
import { compareSessionsDesc, db, type SessionExercise, type SetEntry, type Template } from '../db';
import { clearDraft, editSessionPath } from './draft';
import { ValidationError } from './errors';
import { parseNumber, toInputNumber } from './format';
import { newKey } from './list';

/** Les champs restent des chaînes pendant la saisie pour autoriser les valeurs vides ou partielles. */
export interface DraftSet {
  reps: string;
  load: string;
}

export interface DraftExercise {
  key: string;
  exerciseId: number;
  restSec: number;
  sets: DraftSet[];
}

export interface SessionInput {
  id?: number;
  date: string;
  templateId: number | null;
  templateName: string;
  note: string;
  exercises: DraftExercise[];
}

export const emptySet = (): DraftSet => ({ reps: '', load: '' });

export function toDraftSets(sets: SetEntry[]): DraftSet[] {
  return sets.map((s) => ({ reps: String(s.reps), load: toInputNumber(s.load) }));
}

/** Dernière réalisation d'un exercice à une date donnée ou avant, en ignorant la séance en cours d'édition. */
export function lastEntryForExercise(exerciseId: number, maxDate: string, excludeSessionId?: number) {
  return db.sessionExercises
    .where('[exerciseId+date]')
    .between([exerciseId, Dexie.minKey], [exerciseId, maxDate], true, true)
    .reverse()
    .filter((e) => e.sessionId !== excludeSessionId)
    .first();
}

export async function draftExerciseFor(exerciseId: number, date: string, excludeSessionId?: number): Promise<DraftExercise> {
  const last = await lastEntryForExercise(exerciseId, date, excludeSessionId);
  return {
    key: newKey(),
    exerciseId,
    restSec: last?.restSec ?? 0,
    sets: last?.sets.length ? toDraftSets(last.sets) : [emptySet()],
  };
}

/**
 * Pré-remplit une séance à partir de la dernière séance du même modèle.
 * Un exercice absent de cette séance reprend sa dernière réalisation, quelle que soit la séance,
 * sinon les valeurs par défaut du modèle.
 */
export async function buildDraftFromTemplate(template: Template, date: string): Promise<DraftExercise[]> {
  const previous = (await db.sessions.where('templateId').equals(template.id).toArray())
    .filter((s) => s.date <= date)
    .sort(compareSessionsDesc)[0];
  const previousEntries = previous ? await db.sessionExercises.where('sessionId').equals(previous.id).toArray() : [];

  return Promise.all(
    template.items.map(async (item) => {
      const source =
        previousEntries.find((e) => e.exerciseId === item.exerciseId) ??
        (await lastEntryForExercise(item.exerciseId, date));
      if (source?.sets.length) {
        return { key: newKey(), exerciseId: item.exerciseId, restSec: source.restSec, sets: toDraftSets(source.sets) };
      }
      return {
        key: newKey(),
        exerciseId: item.exerciseId,
        restSec: item.restSec,
        sets: Array.from({ length: Math.max(1, item.sets) }, emptySet),
      };
    }),
  );
}

export async function draftFromSession(sessionId: number) {
  const session = await db.sessions.get(sessionId);
  if (!session) return null;
  const entries = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('position');
  const exercises: DraftExercise[] = entries.map((e) => ({
    key: newKey(),
    exerciseId: e.exerciseId,
    restSec: e.restSec,
    sets: toDraftSets(e.sets),
  }));
  return { session, exercises };
}

type ParsedEntry = Omit<SessionExercise, 'id' | 'sessionId' | 'date'>;

/** Convertit la saisie en données. Les séries entièrement vides sont ignorées, les exercices sans série aussi. */
function parseDraft(exercises: DraftExercise[], nameOf: (exerciseId: number) => string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  for (const exercise of exercises) {
    const sets: SetEntry[] = [];
    exercise.sets.forEach((set, index) => {
      if (set.reps.trim() === '' && set.load.trim() === '') return;
      const where = `${nameOf(exercise.exerciseId)}, série ${index + 1}`;
      const reps = parseNumber(set.reps);
      if (reps === null || !Number.isInteger(reps) || reps <= 0) {
        throw new ValidationError(`${where} : nombre de répétitions invalide.`);
      }
      const load = set.load.trim() === '' ? 0 : parseNumber(set.load);
      if (load === null) throw new ValidationError(`${where} : charge invalide.`);
      sets.push({ reps, load });
    });
    if (sets.length) {
      entries.push({ exerciseId: exercise.exerciseId, position: entries.length, restSec: exercise.restSec, sets });
    }
  }
  return entries;
}

export async function saveSession(input: SessionInput, nameOf: (exerciseId: number) => string) {
  if (!input.date) throw new ValidationError('La date est obligatoire.');
  const entries = parseDraft(input.exercises, nameOf);
  if (entries.length === 0) throw new ValidationError('Aucune série renseignée.');

  return db.transaction('rw', db.sessions, db.sessionExercises, async () => {
    const data = {
      date: input.date,
      templateId: input.templateId,
      templateName: input.templateName,
      note: input.note.trim(),
    };
    let sessionId: number;
    if (input.id !== undefined) {
      sessionId = input.id;
      await db.sessions.put({ id: sessionId, ...data });
      await db.sessionExercises.where('sessionId').equals(sessionId).delete();
    } else {
      sessionId = await db.sessions.add(data);
    }
    await db.sessionExercises.bulkAdd(entries.map((e) => ({ ...e, sessionId, date: input.date })));
    return sessionId;
  });
}

export async function deleteSession(sessionId: number) {
  await db.transaction('rw', db.sessions, db.sessionExercises, async () => {
    await db.sessionExercises.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
  clearDraft(editSessionPath(sessionId));
}
