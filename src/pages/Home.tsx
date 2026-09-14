import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import BackupReminder from '../components/BackupReminder';
import DraftBanners from '../components/DraftBanners';
import { compareSessionsDesc, db } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { formatDate, plural } from '../lib/format';

const PAGE_SIZE = 20;

export default function Home() {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const exercises = useExerciseMap();
  const data = useLiveQuery(async () => {
    const sessions = (await db.sessions.toArray()).sort(compareSessionsDesc);
    const shown = sessions.slice(0, limit);
    const entries = await db.sessionExercises
      .where('sessionId')
      .anyOf(shown.map((s) => s.id))
      .toArray();
    const items = shown.map((session) => {
      const own = entries.filter((e) => e.sessionId === session.id).sort((a, b) => a.position - b.position);
      return {
        session,
        exerciseIds: own.map((e) => e.exerciseId),
        setCount: own.reduce((n, e) => n + e.sets.length, 0),
      };
    });
    return { total: sessions.length, items };
  }, [limit]);

  return (
    <>
      <header className="page-header">
        <h1>Séances</h1>
      </header>

      <DraftBanners />
      {data && <BackupReminder sessionCount={data.total} />}

      <Link to="/seance/nouvelle" className="btn btn-primary btn-block btn-lg">
        + Nouvelle séance
      </Link>

      {data?.items.length === 0 && <p className="empty">Aucune séance enregistrée pour l'instant.</p>}

      {data && data.items.length > 0 && (
        <ul className="list">
          {data.items.map(({ session, exerciseIds, setCount }) => (
            <li key={session.id}>
              <Link to={`/seance/${session.id}`} className="card card-link">
                <div className="card-row">
                  <strong>{session.templateName || 'Séance libre'}</strong>
                  <span className="muted small">{formatDate(session.date)}</span>
                </div>
                <div className="muted small">
                  {plural(exerciseIds.length, 'exercice')} · {plural(setCount, 'série')}
                </div>
                <div className="small clamp">
                  {exerciseIds.map((id) => exercises?.get(id)?.name).filter(Boolean).join(' · ')}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > limit && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
          Afficher plus
        </button>
      )}
    </>
  );
}
