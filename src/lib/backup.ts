import { db, type Exercise, type Session, type SessionExercise, type Template } from '../db';
import { ValidationError } from './errors';
import { todayISO } from './format';

const FORMAT = 'muscu-app-backup';
const LAST_BACKUP_KEY = 'muscu-app:lastBackupAt';
const SNOOZE_KEY = 'muscu-app:backupReminderSnoozedUntil';
const DAY_MS = 86_400_000;

export const BACKUP_REMINDER_DAYS = 30;
const REMINDER_MIN_SESSIONS = 3;
const SNOOZE_DAYS = 7;

interface Backup {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  templates: Template[];
  sessions: Session[];
  sessionExercises: SessionExercise[];
}

function readTimestamp(key: string): number | null {
  try {
    const value = Number(localStorage.getItem(key));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeTimestamp(key: string, timestamp: number) {
  try {
    localStorage.setItem(key, String(timestamp));
  } catch {
    // Stockage indisponible (navigation privée) : on perd seulement le rappel.
  }
}

export const getLastBackupAt = () => readTimestamp(LAST_BACKUP_KEY);

export function snoozeBackupReminder() {
  writeTimestamp(SNOOZE_KEY, Date.now() + SNOOZE_DAYS * DAY_MS);
}

export function shouldRemindBackup(sessionCount: number) {
  if (sessionCount < REMINDER_MIN_SESSIONS) return false;
  const now = Date.now();
  if ((readTimestamp(SNOOZE_KEY) ?? 0) > now) return false;
  const last = getLastBackupAt();
  return last === null || now - last > BACKUP_REMINDER_DAYS * DAY_MS;
}

export type ExportResult = 'shared' | 'downloaded' | 'cancelled';

export async function exportBackup(): Promise<ExportResult> {
  const backup: Backup = {
    format: FORMAT,
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await db.exercises.toArray(),
    templates: await db.templates.toArray(),
    sessions: await db.sessions.toArray(),
    sessionExercises: await db.sessionExercises.toArray(),
  };
  const file = new File([JSON.stringify(backup, null, 2)], `muscu-sauvegarde-${todayISO()}.json`, {
    type: 'application/json',
  });

  // Sur téléphone (surtout une app installée sur iPhone), le partage est plus fiable qu'un téléchargement
  // et permet d'envoyer directement le fichier vers Fichiers, Drive, un mail…
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Sauvegarde Muscu' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      throw error;
    }
    writeTimestamp(LAST_BACKUP_KEY, Date.now());
    return 'shared';
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  writeTimestamp(LAST_BACKUP_KEY, Date.now());
  return 'downloaded';
}

function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.format === FORMAT &&
    ['exercises', 'templates', 'sessions', 'sessionExercises'].every((key) => Array.isArray(record[key]))
  );
}

/** Remplace toutes les données locales par le contenu de la sauvegarde. */
export async function importBackup(file: File) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new ValidationError("Le fichier n'est pas un JSON valide.");
  }
  if (!isBackup(parsed)) throw new ValidationError("Ce fichier n'est pas une sauvegarde de l'app Muscu.");
  const backup = parsed;

  await db.transaction('rw', [db.exercises, db.templates, db.sessions, db.sessionExercises], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.sessions.clear(), db.sessionExercises.clear()]);
    await db.exercises.bulkAdd(backup.exercises);
    await db.templates.bulkAdd(backup.templates);
    await db.sessions.bulkAdd(backup.sessions);
    await db.sessionExercises.bulkAdd(backup.sessionExercises);
  });
  return { sessions: backup.sessions.length, exercises: backup.exercises.length };
}
