import type { ExerciseType, SessionExercise, SetEntry } from '../db';
import { formatNumber, toISODate } from './format';

export type MetricId = 'maxLoad' | 'e1rm' | 'volume' | 'maxReps' | 'totalReps';

export interface Metric {
  id: MetricId;
  label: string;
  description: string;
  unit: string;
  compute: (sets: SetEntry[]) => number | null;
}

export interface MetricPoint {
  sessionId: number;
  date: string;
  value: number;
}

/** Formule d'Epley : charge soulevable une seule fois, estimée à partir d'une série. */
export function estimateOneRepMax({ reps, load }: SetEntry) {
  return reps === 1 ? load : load * (1 + reps / 30);
}

const max = (values: number[]) => (values.length ? Math.max(...values) : null);
const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

/** Indicateurs pertinents selon le type d'exercice. */
export function metricsFor(type: ExerciseType, entries: SessionExercise[]): Metric[] {
  if (type === 'bodyweight') {
    const metrics: Metric[] = [
      {
        id: 'maxReps',
        label: 'Réps max',
        description: 'Meilleure série en répétitions',
        unit: 'réps',
        compute: (sets) => max(sets.map((s) => s.reps)),
      },
      {
        id: 'totalReps',
        label: 'Réps totales',
        description: 'Total des répétitions de la séance',
        unit: 'réps',
        compute: (sets) => sum(sets.map((s) => s.reps)),
      },
    ];
    if (entries.some((e) => e.sets.some((s) => s.load !== 0))) {
      metrics.push({
        id: 'maxLoad',
        label: 'Lest max',
        description: 'Lest le plus lourd de la séance (négatif = assistance)',
        unit: 'kg',
        compute: (sets) => max(sets.map((s) => s.load)),
      });
    }
    return metrics;
  }

  const perDumbbell = type === 'dumbbell' ? ' / haltère' : '';
  return [
    {
      id: 'maxLoad',
      label: 'Charge max',
      description: 'Charge la plus lourde de la séance',
      unit: `kg${perDumbbell}`,
      compute: (sets) => max(sets.map((s) => s.load)),
    },
    {
      id: 'e1rm',
      label: '1RM estimé',
      description: "Charge théorique sur une seule répétition, calculée depuis ta meilleure série (formule d'Epley)",
      unit: `kg${perDumbbell}`,
      compute: (sets) => max(sets.filter((s) => s.load > 0).map(estimateOneRepMax)),
    },
    {
      id: 'volume',
      label: 'Volume',
      description:
        type === 'dumbbell'
          ? 'Répétitions × charge, cumulées sur la séance (deux haltères comptés)'
          : 'Répétitions × charge, cumulées sur la séance',
      unit: 'kg',
      compute: (sets) => sum(sets.map((s) => s.reps * s.load)) * (type === 'dumbbell' ? 2 : 1),
    },
  ];
}

export function roundMetric(metric: Metric, value: number) {
  if (metric.id === 'volume') return Math.round(value);
  return Math.round(value * 10) / 10;
}

export function formatMetric(metric: Metric, value: number) {
  return `${formatNumber(roundMetric(metric, value))} ${metric.unit}`;
}

/** Une valeur par séance, de la plus ancienne à la plus récente. */
export function metricPoints(entries: SessionExercise[], metric: Metric): MetricPoint[] {
  const bySession = new Map<number, { date: string; sets: SetEntry[] }>();
  for (const entry of entries) {
    const group = bySession.get(entry.sessionId);
    if (group) group.sets.push(...entry.sets);
    else bySession.set(entry.sessionId, { date: entry.date, sets: [...entry.sets] });
  }
  const points: MetricPoint[] = [];
  for (const [sessionId, { date, sets }] of bySession) {
    const value = metric.compute(sets);
    if (value !== null) points.push({ sessionId, date, value });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date) || a.sessionId - b.sessionId);
}

export const RANGES = [
  { id: '3m', label: '3 mois', months: 3 },
  { id: '6m', label: '6 mois', months: 6 },
  { id: '1y', label: '1 an', months: 12 },
  { id: 'all', label: 'Tout', months: 0 },
] as const;

export type RangeId = (typeof RANGES)[number]['id'];

/** Première date incluse dans la période (chaîne vide = pas de limite). */
export function rangeStart(id: RangeId) {
  const { months } = RANGES.find((r) => r.id === id)!;
  if (!months) return '';
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return toISODate(date);
}
