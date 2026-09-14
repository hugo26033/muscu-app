import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ExerciseProgress from '../components/ExerciseProgress';
import TypeSelect from '../components/TypeSelect';
import { db, type ExerciseType } from '../db';
import { errorMessage } from '../lib/errors';
import { updateExercise } from '../lib/exercises';
import { formatDate, formatRest, formatSet, plural, TYPE_LABELS } from '../lib/format';
import NotFound from './NotFound';

export default function ExerciseDetail() {
  const exerciseId = Number(useParams().id);
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ name: string; type: ExerciseType } | null>(null);
  const [error, setError] = useState('');

  const data = useLiveQuery(async () => {
    const exercise = await db.exercises.get(exerciseId);
    if (!exercise) return null;
    const history = await db.sessionExercises
      .where('[exerciseId+date]')
      .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
      .reverse()
      .toArray();
    const sessions = await db.sessions.bulkGet(history.map((h) => h.sessionId));
    const usedIn = (await db.templates.toArray())
      .filter((t) => t.items.some((item) => item.exerciseId === exerciseId))
      .map((t) => t.name);
    return { exercise, history, rows: history.map((entry, i) => ({ entry, session: sessions[i] })), usedIn };
  }, [exerciseId]);

  if (data === undefined) return null;
  if (data === null) return <NotFound message="Exercice introuvable." />;

  const { exercise, history, rows, usedIn } = data;
  const canDelete = rows.length === 0 && usedIn.length === 0;

  const save = async () => {
    if (!editing) return;
    try {
      await updateExercise(exerciseId, editing.name, editing.type);
      setEditing(null);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!confirm(`Supprimer l'exercice « ${exercise.name} » ?`)) return;
    navigate('/exercices', { replace: true });
    await db.exercises.delete(exerciseId);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{exercise.name}</h1>
          <div className="muted">{TYPE_LABELS[exercise.type]}</div>
        </div>
        {!editing && (
          <button type="button" className="btn" onClick={() => setEditing({ name: exercise.name, type: exercise.type })}>
            Modifier
          </button>
        )}
      </header>
      <Link to="/exercices" className="back">
        ‹ Exercices
      </Link>

      {editing && (
        <div className="card stack">
          <label className="field">
            Nom
            <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <TypeSelect value={editing.type} onChange={(type) => setEditing({ ...editing, type })} />
          {rows.length > 0 && editing.type !== exercise.type && (
            <p className="muted small">
              Les charges déjà enregistrées ne sont pas converties : elles seront lues selon le nouveau type.
            </p>
          )}
          {error && <div className="error">{error}</div>}
          <div className="row">
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary" onClick={save}>
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {usedIn.length > 0 && <p className="muted small">Dans le programme : {usedIn.join(', ')}</p>}

      <ExerciseProgress entries={history} type={exercise.type} />

      <h2>Historique · {plural(rows.length, 'séance')}</h2>
      {rows.length === 0 ? (
        <p className="empty">Pas encore réalisé.</p>
      ) : (
        <ul className="list">
          {rows.map(({ entry, session }) => (
            <li key={entry.id}>
              <Link to={`/seance/${entry.sessionId}`} className="card card-link">
                <div className="card-row">
                  <strong>{formatDate(entry.date)}</strong>
                  <span className="muted small">
                    {session?.templateName || 'Séance libre'} · récup {formatRest(entry.restSec)}
                  </span>
                </div>
                <ol className="set-list">
                  {entry.sets.map((set, i) => (
                    <li key={i} className="set-chip">
                      {formatSet(set, exercise.type)}
                    </li>
                  ))}
                </ol>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {canDelete && (
        <button type="button" className="btn btn-danger btn-block" onClick={remove}>
          Supprimer l'exercice
        </button>
      )}
    </>
  );
}
