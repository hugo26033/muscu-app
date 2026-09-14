import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router';
import { db } from '../db';
import { useExerciseMap } from '../lib/exercises';
import { plural } from '../lib/format';
import { moveItem } from '../lib/list';

export default function Program() {
  const templates = useLiveQuery(() => db.templates.orderBy('position').toArray(), []);
  const exercises = useExerciseMap();

  const move = async (index: number, direction: -1 | 1) => {
    if (!templates) return;
    const reordered = moveItem(templates, index, direction);
    await db.transaction('rw', db.templates, () =>
      Promise.all(reordered.map((t, position) => db.templates.update(t.id, { position }))),
    );
  };

  return (
    <>
      <header className="page-header">
        <h1>Programme</h1>
      </header>
      <p className="muted small">
        Tes séances types, dans l'ordre du cycle. Les modifier ne change pas les séances déjà enregistrées.
      </p>

      {templates?.length === 0 && <p className="empty">Aucune séance type pour l'instant.</p>}

      {templates && templates.length > 0 && (
        <ul className="list">
          {templates.map((template, index) => (
            <li key={template.id} className="card with-side-actions">
              <Link to={`/programme/${template.id}`} className="grow">
                <strong className="big">{template.name}</strong>
                <div className="muted small">{plural(template.items.length, 'exercice')}</div>
                <div className="small clamp">
                  {template.items.map((item) => exercises?.get(item.exerciseId)?.name).filter(Boolean).join(' · ')}
                </div>
              </Link>
              <div className="side-actions">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Monter"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Descendre"
                  disabled={index === templates.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/programme/nouveau" className="btn btn-primary btn-block">
        + Nouvelle séance type
      </Link>
    </>
  );
}
