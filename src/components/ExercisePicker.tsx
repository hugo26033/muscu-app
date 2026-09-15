import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db, type ExerciseType, type MuscleGroup } from '../db';
import { errorMessage } from '../lib/errors';
import { createExercise, foldName, normalizeName, sortByName } from '../lib/exercises';
import { TYPE_LABELS } from '../lib/format';
import MuscleGroupPicker from './MuscleGroupPicker';
import TypeSelect from './TypeSelect';

interface Props {
  onPick: (exerciseId: number) => void;
  exclude?: number[];
  label?: string;
}

/** Recherche un exercice existant ou en crée un nouveau. */
export default function ExercisePicker({ onPick, exclude = [], label = 'Ajouter un exercice' }: Props) {
  const exercises = useLiveQuery(async () => sortByName(await db.exercises.toArray()), []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ExerciseType>('weighted');
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [error, setError] = useState('');

  const close = () => {
    setOpen(false);
    setQuery('');
    setType('weighted');
    setMuscleGroups([]);
    setError('');
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost btn-block" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  const name = normalizeName(query);
  const folded = foldName(query);
  const all = exercises ?? [];
  const matches = all.filter((e) => !exclude.includes(e.id) && foldName(e.name).includes(folded));
  const exists = all.some((e) => foldName(e.name) === folded);

  const pick = (id: number) => {
    close();
    onPick(id);
  };

  const create = async () => {
    try {
      pick(await createExercise(name, type, muscleGroups));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="card stack">
      <input
        autoFocus
        placeholder="Rechercher ou créer un exercice"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setError('');
        }}
      />
      {matches.length > 0 && (
        <div className="picker-list">
          {matches.map((e) => (
            <button type="button" key={e.id} className="picker-item" onClick={() => pick(e.id)}>
              <span>{e.name}</span>
              <span className="muted small">{TYPE_LABELS[e.type]}</span>
            </button>
          ))}
        </div>
      )}
      {name && !exists && (
        <div className="stack new-exercise">
          <div className="small">
            Nouvel exercice : <strong>{name}</strong>
          </div>
          <TypeSelect value={type} onChange={setType} />
          <MuscleGroupPicker value={muscleGroups} onChange={setMuscleGroups} />
          <button type="button" className="btn btn-primary" onClick={create}>
            Créer « {name} »
          </button>
        </div>
      )}
      {!name && all.length === 0 && <p className="muted small">Tape le nom de ton premier exercice.</p>}
      {error && <div className="error">{error}</div>}
      <button type="button" className="btn" onClick={close}>
        Annuler
      </button>
    </div>
  );
}
