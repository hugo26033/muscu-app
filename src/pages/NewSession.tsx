import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import DraftBanners from '../components/DraftBanners';
import { compareSessionsDesc, db } from '../db';
import { newSessionPath } from '../lib/draft';
import { formatShortDate, plural } from '../lib/format';

export default function NewSession() {
  const data = useLiveQuery(async () => {
    const [templates, sessions] = await Promise.all([db.templates.orderBy('position').toArray(), db.sessions.toArray()]);
    const byRecency = sessions.filter((s) => s.templateId !== null).sort(compareSessionsDesc);

    const lastDate = new Map<number, string>();
    for (const s of byRecency) if (!lastDate.has(s.templateId!)) lastDate.set(s.templateId!, s.date);

    // Programme fixe : on suggère la séance qui suit la dernière réalisée.
    const lastIndex = templates.findIndex((t) => t.id === byRecency[0]?.templateId);
    const suggestedId = templates.length ? templates[(lastIndex + 1) % templates.length].id : null;

    return { templates, lastDate, suggestedId };
  }, []);

  if (!data) return null;

  return (
    <>
      <header className="page-header">
        <h1>Nouvelle séance</h1>
      </header>
      <Link to="/seances" className="back">
        ‹ Séances
      </Link>

      <DraftBanners />

      {data.templates.length === 0 ? (
        <div className="empty">
          <p>Aucune séance type définie.</p>
          <Link to="/programme/nouveau" className="btn btn-primary">
            Créer une séance type
          </Link>
        </div>
      ) : (
        <ul className="list">
          {data.templates.map((template) => {
            const last = data.lastDate.get(template.id);
            return (
              <li key={template.id}>
                <Link to={newSessionPath(template.id)} className="card card-link">
                  <div className="card-row">
                    <strong className="big">{template.name}</strong>
                    {template.id === data.suggestedId && <span className="badge">Suivante</span>}
                  </div>
                  <div className="muted small">
                    {plural(template.items.length, 'exercice')} ·{' '}
                    {last ? `dernière fois le ${formatShortDate(last)}` : 'jamais réalisée'}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link to={newSessionPath(null)} className="btn btn-ghost btn-block">
        Séance libre (sans modèle)
      </Link>
    </>
  );
}
