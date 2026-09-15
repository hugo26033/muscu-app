import Dexie, { type EntityTable } from 'dexie';

/**
 * - weighted : barre, machine, poulie — charge totale en kg
 * - dumbbell : haltères — charge d'un haltère en kg
 * - bodyweight : poids du corps — lest en kg (négatif = assistance, 0 = poids du corps seul)
 */
export type ExerciseType = 'weighted' | 'dumbbell' | 'bodyweight';

export const MUSCLE_GROUPS = [
  'Dorsaux',
  'Pectoraux',
  'Quadriceps',
  'Triceps',
  'Biceps',
  'Epaules',
  'Fessiers',
  'Adducteurs',
  'Abs',
  'Mollets',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export interface Exercise {
  id: number;
  name: string;
  type: ExerciseType;
  /** Conseils d'exécution (placement, tempo, points de vigilance…), optionnel. */
  note?: string;
  /** Groupes musculaires recrutés, optionnel (pas encore classé si absent/vide). */
  muscleGroups?: MuscleGroup[];
}

export interface TemplateItem {
  exerciseId: number;
  sets: number;
  restSec: number;
}

/** Séance type du programme (ex. « Push »). */
export interface Template {
  id: number;
  name: string;
  position: number;
  items: TemplateItem[];
}

export interface Session {
  id: number;
  /** Date locale au format AAAA-MM-JJ. */
  date: string;
  templateId: number | null;
  /** Copie du nom au moment de la séance : l'historique survit au renommage ou à la suppression du modèle. */
  templateName: string;
  note: string;
}

export interface SetEntry {
  reps: number;
  load: number;
}

/** Un exercice réalisé dans une séance. La date est dupliquée pour indexer l'historique par exercice. */
export interface SessionExercise {
  id: number;
  sessionId: number;
  exerciseId: number;
  date: string;
  position: number;
  restSec: number;
  sets: SetEntry[];
}

export const db = new Dexie('muscu-app') as Dexie & {
  exercises: EntityTable<Exercise, 'id'>;
  templates: EntityTable<Template, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  sessionExercises: EntityTable<SessionExercise, 'id'>;
};

db.version(1).stores({
  exercises: '++id, name',
  templates: '++id, position',
  sessions: '++id, date, templateId',
  sessionExercises: '++id, sessionId, exerciseId, [exerciseId+date]',
});

export function compareSessionsDesc(a: Session, b: Session) {
  return b.date.localeCompare(a.date) || b.id - a.id;
}
