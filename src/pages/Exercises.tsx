import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate } from 'react-router';
import ExercisePicker from '../components/ExercisePicker';
import { db } from '../db';
import { sortByName } from '../lib/exercises';
import { formatShortDate, plural, TYPE_LABELS } from '../lib/format';

export default function Exercises() {
  const navigate = useNavigate();
  const data = useLiveQuery(async () => {
    const [exercises, entries] = await Promise.all([db.exercises.toArray(), db.sessionExercises.toArray()]);
    const stats = new Map<number, { count: number; last: string }>();
    for (const entry of entries) {
      const stat = stats.get(entry.exerciseId);
      if (!stat) stats.set(entry.exerciseId, { count: 1, last: entry.date });
      else {
        stat.count++;
        if (entry.date > stat.last) stat.last = entry.date;
      }
    }
    return sortByName(exercises).map((exercise) => ({ exercise, stats: stats.get(exercise.id) }));
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>Exercices</h1>
      </header>

      <ExercisePicker label="Rechercher ou créer un exercice" onPick={(id) => navigate(`/exercices/${id}`)} />

      {data?.length === 0 && <p className="empty">Aucun exercice. Ils sont aussi créés depuis le programme ou la saisie.</p>}

      {data && data.length > 0 && (
        <ul className="list">
          {data.map(({ exercise, stats }) => (
            <li key={exercise.id}>
              <Link to={`/exercices/${exercise.id}`} className="card card-link">
                <div className="card-row">
                  <strong>{exercise.name}</strong>
                  <span className="muted small">{TYPE_LABELS[exercise.type]}</span>
                </div>
                <div className="muted small">
                  {stats
                    ? `${plural(stats.count, 'séance')} · dernière le ${formatShortDate(stats.last)}`
                    : 'Jamais réalisé'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
