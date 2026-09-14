import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import ExercisePicker from '../components/ExercisePicker';
import RestSelect from '../components/RestSelect';
import { db, type TemplateItem } from '../db';
import { errorMessage, ValidationError } from '../lib/errors';
import { useExerciseMap } from '../lib/exercises';
import { TYPE_LABELS } from '../lib/format';
import { moveItem, newKey } from '../lib/list';
import NotFound from './NotFound';

interface ItemDraft {
  key: string;
  exerciseId: number;
  sets: string;
  restSec: number;
}

export default function TemplateEditor() {
  const { id } = useParams();
  const templateId = id === 'nouveau' ? undefined : Number(id);
  const navigate = useNavigate();
  const exercises = useExerciseMap();
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(templateId === undefined ? 'ready' : 'loading');
  const [name, setName] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (templateId === undefined) return;
    let cancelled = false;
    db.templates.get(templateId).then((template) => {
      if (cancelled) return;
      if (!template) return setStatus('missing');
      setName(template.name);
      setItems(template.items.map((item) => ({ ...item, key: newKey(), sets: String(item.sets) })));
      setStatus('ready');
    });
    return () => {
      cancelled = true;
    };
  }, [templateId]);

  if (status === 'loading') return null;
  if (status === 'missing') return <NotFound message="Séance type introuvable." />;

  const update = (key: string, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const save = async () => {
    try {
      const cleanName = name.trim();
      if (!cleanName) throw new ValidationError('Donne un nom à la séance type.');
      if (items.length === 0) throw new ValidationError('Ajoute au moins un exercice.');
      const parsed: TemplateItem[] = items.map((item) => {
        const sets = Number(item.sets);
        if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
          const exerciseName = exercises?.get(item.exerciseId)?.name ?? 'un exercice';
          throw new ValidationError(`Nombre de séries invalide pour ${exerciseName} (entre 1 et 20).`);
        }
        return { exerciseId: item.exerciseId, sets, restSec: item.restSec };
      });

      if (templateId === undefined) {
        const last = await db.templates.orderBy('position').last();
        await db.templates.add({ name: cleanName, items: parsed, position: (last?.position ?? -1) + 1 });
      } else {
        await db.templates.update(templateId, { name: cleanName, items: parsed });
      }
      navigate('/programme');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = async () => {
    if (templateId === undefined) return;
    if (!confirm(`Supprimer la séance type « ${name} » ? Les séances déjà enregistrées sont conservées.`)) return;
    navigate('/programme', { replace: true });
    await db.templates.delete(templateId);
  };

  return (
    <>
      <header className="page-header">
        <h1>{templateId === undefined ? 'Nouvelle séance type' : 'Séance type'}</h1>
      </header>
      <Link to="/programme" className="back">
        ‹ Programme
      </Link>

      <label className="field">
        Nom
        <input value={name} placeholder="Push, Haut du corps, Jambes…" onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="stack">
        {items.map((item, index) => {
          const exercise = exercises?.get(item.exerciseId);
          return (
            <section key={item.key} className="card">
              <div className="card-row">
                <div>
                  <strong>{exercise?.name ?? '…'}</strong>
                  {exercise && <div className="muted small">{TYPE_LABELS[exercise.type]}</div>}
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Monter"
                    disabled={index === 0}
                    onClick={() => setItems((list) => moveItem(list, index, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Descendre"
                    disabled={index === items.length - 1}
                    onClick={() => setItems((list) => moveItem(list, index, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Retirer"
                    onClick={() => setItems((list) => list.filter((i) => i.key !== item.key))}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="row compact-fields">
                <label className="field">
                  Séries
                  <input inputMode="numeric" value={item.sets} onChange={(e) => update(item.key, { sets: e.target.value })} />
                </label>
                <label className="field">
                  Récupération
                  <RestSelect value={item.restSec} onChange={(restSec) => update(item.key, { restSec })} />
                </label>
              </div>
            </section>
          );
        })}

        <ExercisePicker
          exclude={items.map((i) => i.exerciseId)}
          onPick={(exerciseId) => setItems((list) => [...list, { key: newKey(), exerciseId, sets: '3', restSec: 90 }])}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="sticky-actions">
        <button type="button" className="btn" onClick={() => navigate('/programme')}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary grow" onClick={save}>
          Enregistrer
        </button>
      </div>

      {templateId !== undefined && (
        <button type="button" className="btn btn-danger btn-block" onClick={remove}>
          Supprimer la séance type
        </button>
      )}
    </>
  );
}
