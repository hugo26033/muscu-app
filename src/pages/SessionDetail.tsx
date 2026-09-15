import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useNavigate, useParams } from 'react-router';
import { db } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { formatDate, formatRest, formatSet, plural } from '../lib/format';
import { deleteSession } from '../lib/sessions';
import NotFound from './NotFound';

export default function SessionDetail() {
  const sessionId = Number(useParams().id);
  const navigate = useNavigate();
  const exercises = useExerciseMap();
  const data = useLiveQuery(async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;
    const entries = await db.sessionExercises.where('sessionId').equals(sessionId).sortBy('position');
    return { session, entries };
  }, [sessionId]);

  if (data === undefined) return null;
  if (data === null) return <NotFound message="Séance introuvable." />;

  const { session, entries } = data;
  const setCount = entries.reduce((n, e) => n + e.sets.length, 0);

  const remove = async () => {
    if (!confirm('Supprimer définitivement cette séance ?')) return;
    navigate('/seances', { replace: true });
    await deleteSession(sessionId);
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>{session.templateName || 'Séance libre'}</h1>
          <div className="muted">{formatDate(session.date, { dateStyle: 'full' })}</div>
        </div>
      </header>
      <Link to="/seances" className="back">
        ‹ Séances
      </Link>

      <p className="muted small">
        {plural(entries.length, 'exercice')} · {plural(setCount, 'série')}
      </p>

      <ul className="list">
        {entries.map((entry) => {
          const exercise = exercises?.get(entry.exerciseId);
          const type = exercise?.type ?? 'weighted';
          return (
            <li key={entry.id} className="card">
              <div className="card-row">
                <Link to={`/exercices/${entry.exerciseId}`}>
                  <strong className="big">{exercise?.name ?? '…'}</strong>
                </Link>
                <span className="muted small nowrap">Récup :{formatRest(entry.restSec)}</span>
              </div>
              <ol className="set-list">
                {entry.sets.map((set, i) => (
                  <li key={i} className="set-chip">
                    {formatSet(set, type)}
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ul>

      {session.note && (
        <div className="card note">
          <div className="muted small">Note</div>
          {session.note}
        </div>
      )}

      <div className="row actions-row">
        <Link to={`/seance/${sessionId}/modifier`} className="btn btn-primary">
          Modifier
        </Link>
        <button type="button" className="btn btn-danger" onClick={remove}>
          Supprimer
        </button>
      </div>
    </>
  );
}
