import { MUSCLE_GROUPS, type MuscleGroup } from '../db';
import { MUSCLE_GROUP_COLORS } from '../lib/muscleColors';

interface Props {
  value: MuscleGroup[];
  onChange: (groups: MuscleGroup[]) => void;
}

/** Sélection multiple des groupes musculaires recrutés par un exercice. */
export default function MuscleGroupPicker({ value, onChange }: Props) {
  const toggle = (group: MuscleGroup) => {
    onChange(value.includes(group) ? value.filter((g) => g !== group) : [...value, group]);
  };

  return (
    <div className="chip-group" role="group" aria-label="Groupes musculaires">
      {MUSCLE_GROUPS.map((group) => {
        const active = value.includes(group);
        const color = MUSCLE_GROUP_COLORS[group];
        return (
          <button
            key={group}
            type="button"
            aria-pressed={active}
            className={`chip${active ? ' active' : ''}`}
            style={active ? { borderColor: color, background: `${color}26`, color } : undefined}
            onClick={() => toggle(group)}
          >
            {group}
          </button>
        );
      })}
    </div>
  );
}
