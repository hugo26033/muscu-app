import type { ExerciseType, SetEntry } from '../db';

export const TYPE_LABELS: Record<ExerciseType, string> = {
  weighted: 'Charge',
  dumbbell: 'Haltères',
  bodyweight: 'Poids du corps',
};

export const LOAD_LABELS: Record<ExerciseType, string> = {
  weighted: 'kg',
  dumbbell: 'kg / haltère',
  bodyweight: 'lest kg',
};

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayISO = () => toISODate(new Date());

export function formatDate(
  iso: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', options);
}

export const formatShortDate = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short' });

export function formatNumber(n: number) {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

/** Accepte la virgule comme séparateur décimal. Renvoie null si la saisie n'est pas un nombre. */
export function parseNumber(value: string): number | null {
  const text = value.trim().replace(',', '.').replace('−', '-');
  if (text === '') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Valeur numérique pré-remplie dans un champ (virgule décimale). */
export function toInputNumber(n: number) {
  return String(n).replace('.', ',');
}

export function formatLoad(load: number, type: ExerciseType) {
  if (type === 'bodyweight') {
    if (load === 0) return 'PDC';
    return load > 0 ? `PDC +${formatNumber(load)}` : `PDC −${formatNumber(-load)}`;
  }
  return `${formatNumber(load)} kg`;
}

export function formatSet(set: SetEntry, type: ExerciseType) {
  return `${set.reps} × ${formatLoad(set.load, type)}`;
}

export function formatRest(sec: number) {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (!m) return `${s} s`;
  return s ? `${m} min ${String(s).padStart(2, '0')}` : `${m} min`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? 's' : ''}`;
}

export type Trend = 'up' | 'down' | 'same';

/** Compare une série à la même série de la séance précédente : la charge prime, puis les répétitions. */
export function compareSets(current: SetEntry, previous: SetEntry | undefined): Trend | null {
  if (!previous) return null;
  if (current.load !== previous.load) return current.load > previous.load ? 'up' : 'down';
  if (current.reps !== previous.reps) return current.reps > previous.reps ? 'up' : 'down';
  return 'same';
}

export const TREND_ICONS: Record<Trend, string> = { up: '▲', down: '▼', same: '=' };

/** « il y a 5 minutes », « il y a 2 heures », « hier », « il y a 12 jours ». */
export function formatRelativeTime(timestamp: number) {
  const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  return rtf.format(-Math.round(hours / 24), 'day');
}
