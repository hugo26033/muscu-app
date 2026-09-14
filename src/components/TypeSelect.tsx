import type { ExerciseType } from '../db';
import { TYPE_LABELS } from '../lib/format';

const TYPES = Object.keys(TYPE_LABELS) as ExerciseType[];

export default function TypeSelect({ value, onChange }: { value: ExerciseType; onChange: (type: ExerciseType) => void }) {
  return (
    <div className="segmented" role="radiogroup" aria-label="Type d'exercice">
      {TYPES.map((type) => (
        <button
          key={type}
          type="button"
          role="radio"
          aria-checked={value === type}
          className={value === type ? 'active' : ''}
          onClick={() => onChange(type)}
        >
          {TYPE_LABELS[type]}
        </button>
      ))}
    </div>
  );
}
