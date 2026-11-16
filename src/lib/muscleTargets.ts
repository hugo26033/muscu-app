import { MUSCLE_GROUPS, type MuscleGroup } from '../db';

export type MuscleTargets = Partial<Record<MuscleGroup, number>>;

const STORAGE_KEY = 'muscu-app:muscleTargets';

export function sanitizeMuscleTargets(raw: unknown): MuscleTargets {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const result: MuscleTargets = {};
  for (const group of MUSCLE_GROUPS) {
    const value = Number(record[group]);
    if (Number.isInteger(value) && value >= 1 && value <= 99) {
      result[group] = value;
    }
  }
  return result;
}

export function loadMuscleTargets(): MuscleTargets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitizeMuscleTargets(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveMuscleTargets(targets: MuscleTargets) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeMuscleTargets(targets)));
  } catch {
    // Stockage indisponible (navigation privée).
  }
}
