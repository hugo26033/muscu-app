import type { Exercise, ExerciseType, MuscleGroup } from './db';

type SeedExercise = { name: string; type: ExerciseType; muscleGroups: MuscleGroup[] };

/**
 * Exercices de musculation les plus pratiqués en salle, noms en anglais (convention internationale).
 * Chargés une seule fois à la création de la base (voir db.ts, db.on('populate')) : n'affecte jamais
 * une base existante, et l'utilisateur peut renommer/supprimer librement ensuite.
 */
export const SEED_EXERCISES: SeedExercise[] = [
  // Pectoraux
  { name: 'Barbell Bench Press', type: 'weighted', muscleGroups: ['Pectoraux', 'Triceps', 'Epaules'] },
  { name: 'Incline Barbell Bench Press', type: 'weighted', muscleGroups: ['Pectoraux', 'Epaules', 'Triceps'] },
  { name: 'Decline Barbell Bench Press', type: 'weighted', muscleGroups: ['Pectoraux', 'Triceps'] },
  { name: 'Dumbbell Bench Press', type: 'dumbbell', muscleGroups: ['Pectoraux', 'Triceps', 'Epaules'] },
  { name: 'Incline Dumbbell Press', type: 'dumbbell', muscleGroups: ['Pectoraux', 'Epaules', 'Triceps'] },
  { name: 'Dumbbell Fly', type: 'dumbbell', muscleGroups: ['Pectoraux'] },
  { name: 'Cable Fly', type: 'weighted', muscleGroups: ['Pectoraux'] },
  { name: 'Pec Deck', type: 'weighted', muscleGroups: ['Pectoraux'] },
  { name: 'Push-Up', type: 'bodyweight', muscleGroups: ['Pectoraux', 'Triceps', 'Epaules'] },
  { name: 'Dip', type: 'bodyweight', muscleGroups: ['Pectoraux', 'Triceps', 'Epaules'] },

  // Dos
  { name: 'Deadlift', type: 'weighted', muscleGroups: ['Dorsaux', 'Ischio', 'Fessiers'] },
  { name: 'Pull-Up', type: 'bodyweight', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'Chin-Up', type: 'bodyweight', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'Lat Pulldown', type: 'weighted', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'Barbell Row', type: 'weighted', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'Pendlay Row', type: 'weighted', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'T-Bar Row', type: 'weighted', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'Seated Cable Row', type: 'weighted', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'One-Arm Dumbbell Row', type: 'dumbbell', muscleGroups: ['Dorsaux', 'Biceps'] },
  { name: 'Straight-Arm Pulldown', type: 'weighted', muscleGroups: ['Dorsaux'] },
  { name: 'Rack Pull', type: 'weighted', muscleGroups: ['Dorsaux', 'Ischio'] },

  // Épaules
  { name: 'Overhead Press', type: 'weighted', muscleGroups: ['Epaules', 'Triceps'] },
  { name: 'Seated Dumbbell Shoulder Press', type: 'dumbbell', muscleGroups: ['Epaules', 'Triceps'] },
  { name: 'Arnold Press', type: 'dumbbell', muscleGroups: ['Epaules', 'Triceps'] },
  { name: 'Lateral Raise', type: 'dumbbell', muscleGroups: ['Epaules'] },
  { name: 'Cable Lateral Raise', type: 'weighted', muscleGroups: ['Epaules'] },
  { name: 'Front Raise', type: 'dumbbell', muscleGroups: ['Epaules'] },
  { name: 'Rear Delt Fly', type: 'dumbbell', muscleGroups: ['Epaules', 'Dorsaux'] },
  { name: 'Face Pull', type: 'weighted', muscleGroups: ['Epaules', 'Dorsaux'] },
  { name: 'Barbell Shrug', type: 'weighted', muscleGroups: ['Epaules'] },
  { name: 'Dumbbell Shrug', type: 'dumbbell', muscleGroups: ['Epaules'] },
  { name: 'Upright Row', type: 'weighted', muscleGroups: ['Epaules', 'Dorsaux'] },

  // Biceps
  { name: 'Barbell Curl', type: 'weighted', muscleGroups: ['Biceps'] },
  { name: 'Dumbbell Curl', type: 'dumbbell', muscleGroups: ['Biceps'] },
  { name: 'Hammer Curl', type: 'dumbbell', muscleGroups: ['Biceps'] },
  { name: 'Incline Dumbbell Curl', type: 'dumbbell', muscleGroups: ['Biceps'] },
  { name: 'Preacher Curl', type: 'weighted', muscleGroups: ['Biceps'] },
  { name: 'Cable Curl', type: 'weighted', muscleGroups: ['Biceps'] },
  { name: 'Concentration Curl', type: 'dumbbell', muscleGroups: ['Biceps'] },

  // Triceps
  { name: 'Close-Grip Bench Press', type: 'weighted', muscleGroups: ['Triceps', 'Pectoraux'] },
  { name: 'Triceps Pushdown', type: 'weighted', muscleGroups: ['Triceps'] },
  { name: 'Overhead Triceps Extension', type: 'dumbbell', muscleGroups: ['Triceps'] },
  { name: 'Skull Crusher', type: 'weighted', muscleGroups: ['Triceps'] },
  { name: 'Triceps Kickback', type: 'dumbbell', muscleGroups: ['Triceps'] },
  { name: 'Bench Dip', type: 'bodyweight', muscleGroups: ['Triceps', 'Pectoraux'] },

  // Jambes — quadriceps / fessiers / ischios / mollets / adducteurs
  { name: 'Barbell Back Squat', type: 'weighted', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Front Squat', type: 'weighted', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Goblet Squat', type: 'dumbbell', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Bulgarian Split Squat', type: 'dumbbell', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Walking Lunge', type: 'dumbbell', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Leg Press', type: 'weighted', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Leg Extension', type: 'weighted', muscleGroups: ['Quadriceps'] },
  { name: 'Hack Squat', type: 'weighted', muscleGroups: ['Quadriceps', 'Fessiers'] },
  { name: 'Romanian Deadlift', type: 'weighted', muscleGroups: ['Ischio', 'Fessiers'] },
  { name: 'Stiff-Leg Deadlift', type: 'weighted', muscleGroups: ['Ischio', 'Fessiers'] },
  { name: 'Leg Curl', type: 'weighted', muscleGroups: ['Ischio'] },
  { name: 'Hip Thrust', type: 'weighted', muscleGroups: ['Fessiers', 'Ischio'] },
  { name: 'Glute Bridge', type: 'bodyweight', muscleGroups: ['Fessiers'] },
  { name: 'Cable Kickback', type: 'weighted', muscleGroups: ['Fessiers'] },
  { name: 'Hip Abduction Machine', type: 'weighted', muscleGroups: ['Fessiers', 'Adducteurs'] },
  { name: 'Hip Adduction Machine', type: 'weighted', muscleGroups: ['Adducteurs'] },
  { name: 'Standing Calf Raise', type: 'weighted', muscleGroups: ['Mollets'] },
  { name: 'Seated Calf Raise', type: 'weighted', muscleGroups: ['Mollets'] },

  // Abdos
  { name: 'Plank', type: 'bodyweight', muscleGroups: ['Abs'] },
  { name: 'Crunch', type: 'bodyweight', muscleGroups: ['Abs'] },
  { name: 'Cable Crunch', type: 'weighted', muscleGroups: ['Abs'] },
  { name: 'Hanging Leg Raise', type: 'bodyweight', muscleGroups: ['Abs'] },
  { name: 'Sit-Up', type: 'bodyweight', muscleGroups: ['Abs'] },
  { name: 'Russian Twist', type: 'bodyweight', muscleGroups: ['Abs'] },
  { name: 'Ab Wheel Rollout', type: 'bodyweight', muscleGroups: ['Abs'] },
];

export function buildSeedExercises(): Omit<Exercise, 'id'>[] {
  return SEED_EXERCISES.map(({ name, type, muscleGroups }) => ({ name, type, muscleGroups }));
}
