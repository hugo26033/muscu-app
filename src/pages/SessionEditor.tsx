import { useLiveQuery } from 'dexie-react-hooks';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import ExercisePicker from '../components/ExercisePicker';
import RestSelect from '../components/RestSelect';
import { db } from '../db';
import { clearDraft, editSessionPath, loadDraft, newSessionPath, saveDraft, type SessionDraft } from '../lib/draft';
import { errorMessage } from '../lib/errors';
import { useExerciseMap } from '../lib/exercises';
import {
  compareSets,
  formatRelativeTime,
  formatSet,
  formatShortDate,
  LOAD_LABELS,
  parseNumber,
  todayISO,
  TREND_ICONS,
  TYPE_LABELS,
} from '../lib/format';
import { moveItem } from '../lib/list';
import {
  buildDraftFromTemplate,
  draftExerciseFor,
  draftFromSession,
  emptySet,
  lastEntryForExercise,
  saveSession,
  type DraftExercise,
  type DraftSet,
} from '../lib/sessions';
import NotFound from './NotFound';

interface FormProps {
  /** Route de l'écran, qui sert aussi de clé au brouillon. */
  path: string;
  sessionId?: number;
  templateId: number | null;
  templateName: string;
  initialDate: string;
  initialNote: string;
  initialExercises: DraftExercise[];
  /** Renseigné quand la saisie reprend un brouillon. */
  restoredAt?: number;
}

function fromDraft(path: string, draft: SessionDraft): FormProps {
  return {
    path,
    sessionId: draft.sessionId,
    templateId: draft.templateId,
    templateName: draft.templateName,
    initialDate: draft.date,
    initialNote: draft.note,
    initialExercises: draft.exercises,
    restoredAt: draft.updatedAt,
  };
}

/** Charge l'état initial du formulaire une seule fois (null = introuvable). */
function useInitialForm(load: () => Promise<FormProps | null>, deps: unknown[]) {
  const [initial, setInitial] = useState<FormProps | null>();
  useEffect(() => {
    let cancelled = false;
    load().then((result) => {
      if (!cancelled) setInitial(result);
    });
    return () => {
      cancelled = true;
    };
  }, deps);
  return initial;
}

export function NewSessionPage() {
  const { templateId = '' } = useParams();
  const initial = useInitialForm(async () => {
    const path = newSessionPath(templateId);
    const draft = loadDraft(path);
    if (draft) return fromDraft(path, draft);

    const date = todayISO();
    const base = { path, templateId: null, templateName: '', initialDate: date, initialNote: '', initialExercises: [] };
    if (templateId === 'libre') return base;
    const template = await db.templates.get(Number(templateId));
    if (!template) return null;
    const initialExercises = await buildDraftFromTemplate(template, date);
    return { ...base, templateId: template.id, templateName: template.name, initialExercises };
  }, [templateId]);

  if (initial === undefined) return null;
  if (initial === null) return <NotFound message="Séance type introuvable." />;
  return <SessionForm {...initial} />;
}

export function EditSessionPage() {
  const sessionId = Number(useParams().id);
  const initial = useInitialForm(async () => {
    const path = editSessionPath(sessionId);
    const saved = await draftFromSession(sessionId);
    if (!saved) {
      clearDraft(path);
      return null;
    }
    const draft = loadDraft(path);
    if (draft) return fromDraft(path, draft);
    return {
      path,
      sessionId,
      templateId: saved.session.templateId,
      templateName: saved.session.templateName,
      initialDate: saved.session.date,
      initialNote: saved.session.note,
      initialExercises: saved.exercises,
    };
  }, [sessionId]);

  if (initial === undefined) return null;
  if (initial === null) return <NotFound message="Séance introuvable." />;
  return <SessionForm {...initial} />;
}

function SessionForm(props: FormProps) {
  const navigate = useNavigate();
  const exerciseMap = useExerciseMap();
  const [date, setDate] = useState(props.initialDate);
  const [note, setNote] = useState(props.initialNote);
  const [exercises, setExercises] = useState(props.initialExercises);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Brouillon automatique : dès que la saisie diffère de l'état chargé, elle est conservée localement.
  const snapshot = JSON.stringify({ date, note, exercises });
  const [baseline] = useState(snapshot);
  const dirty = snapshot !== baseline || props.restoredAt !== undefined;
  useEffect(() => {
    if (snapshot === baseline) return;
    saveDraft({
      sessionId: props.sessionId,
      templateId: props.templateId,
      templateName: props.templateName,
      date,
      note,
      exercises,
      updatedAt: Date.now(),
    });
  }, [snapshot]);

  const idsKey = exercises.map((e) => e.exerciseId).join(',');
  const lastEntries = useLiveQuery(async () => {
    const ids = [...new Set(idsKey ? idsKey.split(',').map(Number) : [])];
    const pairs = await Promise.all(
      ids.map(async (id) => [id, await lastEntryForExercise(id, date, props.sessionId)] as const),
    );
    return new Map(pairs);
  }, [idsKey, date, props.sessionId]);

  const updateExercise = (key: string, update: (exercise: DraftExercise) => DraftExercise) =>
    setExercises((list) => list.map((ex) => (ex.key === key ? update(ex) : ex)));

  const updateSet = (key: string, index: number, field: keyof DraftSet, value: string) =>
    updateExercise(key, (ex) => ({
      ...ex,
      sets: ex.sets.map((set, i) => (i === index ? { ...set, [field]: value } : set)),
    }));

  const addSet = (key: string) =>
    updateExercise(key, (ex) => ({ ...ex, sets: [...ex.sets, { ...(ex.sets.at(-1) ?? emptySet()) }] }));

  const removeSet = (key: string, index: number) =>
    updateExercise(key, (ex) => ({ ...ex, sets: ex.sets.filter((_, i) => i !== index) }));

  const removeExercise = (exercise: DraftExercise) => {
    const name = exerciseMap?.get(exercise.exerciseId)?.name ?? 'cet exercice';
    if (confirm(`Retirer ${name} de la séance ?`)) {
      setExercises((list) => list.filter((ex) => ex.key !== exercise.key));
    }
  };

  const addExercise = async (exerciseId: number) => {
    const draft = await draftExerciseFor(exerciseId, date, props.sessionId);
    setExercises((list) => [...list, draft]);
  };

  const exit = () => navigate(props.sessionId !== undefined ? `/seance/${props.sessionId}` : '/', { replace: true });

  const cancel = () => {
    if (dirty && !confirm('Abandonner la saisie ? Les valeurs non enregistrées seront perdues.')) return;
    clearDraft(props.path);
    exit();
  };

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      const id = await saveSession(
        { id: props.sessionId, date, templateId: props.templateId, templateName: props.templateName, note, exercises },
        (exerciseId) => exerciseMap?.get(exerciseId)?.name ?? 'Exercice',
      );
      clearDraft(props.path);
      navigate(`/seance/${id}`, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>{props.templateName || 'Séance libre'}</h1>
      </header>

      {props.restoredAt !== undefined && (
        <div className="notice small">
          Saisie non enregistrée restaurée (modifiée {formatRelativeTime(props.restoredAt)}). « Annuler » la supprime.
        </div>
      )}

      <label className="field">
        Date
        <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
      </label>

      <div className="stack">
        {exercises.map((exercise, index) => {
          const info = exerciseMap?.get(exercise.exerciseId);
          const type = info?.type ?? 'weighted';
          const last = lastEntries?.get(exercise.exerciseId);
          return (
            <section key={exercise.key} className="card exercise-card">
              <div className="card-row">
                <div>
                  <strong className="big">{info?.name ?? '…'}</strong>
                  <div className="muted small">{TYPE_LABELS[type]}</div>
                </div>
                <div className="actions">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Monter"
                    disabled={index === 0}
                    onClick={() => setExercises((list) => moveItem(list, index, -1))}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Descendre"
                    disabled={index === exercises.length - 1}
                    onClick={() => setExercises((list) => moveItem(list, index, 1))}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Retirer l'exercice"
                    onClick={() => removeExercise(exercise)}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {lastEntries && (
                <p className="last-perf">
                  {last
                    ? `Dernière fois (${formatShortDate(last.date)}) : ${last.sets.map((s) => formatSet(s, type)).join(' · ')}`
                    : 'Première fois sur cet exercice'}
                </p>
              )}

              <div className="inline-field">
                <label htmlFor={`rest-${exercise.key}`} className="muted small">
                  Récupération
                </label>
                <RestSelect
                  id={`rest-${exercise.key}`}
                  value={exercise.restSec}
                  onChange={(restSec) => updateExercise(exercise.key, (ex) => ({ ...ex, restSec }))}
                />
              </div>

              <div className="sets-grid">
                <span className="head">Série</span>
                <span className="head">Réps</span>
                <span className="head">{LOAD_LABELS[type]}</span>
                <span />
                <span />
                {exercise.sets.map((set, i) => {
                  const previous = last?.sets[i];
                  const reps = parseNumber(set.reps);
                  const load = set.load.trim() === '' ? 0 : parseNumber(set.load);
                  const trend = reps !== null && load !== null ? compareSets({ reps, load }, previous) : null;
                  return (
                    <Fragment key={i}>
                      <span className="set-index">{i + 1}</span>
                      <input
                        inputMode="numeric"
                        enterKeyHint="next"
                        aria-label={`Répétitions série ${i + 1}`}
                        value={set.reps}
                        placeholder={previous ? String(previous.reps) : ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateSet(exercise.key, i, 'reps', e.target.value)}
                      />
                      <input
                        inputMode={type === 'bodyweight' ? 'text' : 'decimal'}
                        enterKeyHint="next"
                        aria-label={`Charge série ${i + 1}`}
                        value={set.load}
                        placeholder={type === 'bodyweight' ? '0' : ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateSet(exercise.key, i, 'load', e.target.value)}
                      />
                      <span className={`trend ${trend ? `trend-${trend}` : ''}`} title="Par rapport à la dernière fois">
                        {trend ? TREND_ICONS[trend] : ''}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Supprimer la série ${i + 1}`}
                        onClick={() => removeSet(exercise.key, i)}
                      >
                        ✕
                      </button>
                    </Fragment>
                  );
                })}
              </div>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => addSet(exercise.key)}>
                + Série
              </button>
            </section>
          );
        })}

        <ExercisePicker exclude={exercises.map((e) => e.exerciseId)} onPick={addExercise} />
      </div>

      <label className="field note-field">
        Note (optionnelle)
        <textarea rows={2} value={note} placeholder="Forme, douleurs, remarques…" onChange={(e) => setNote(e.target.value)} />
      </label>

      {error && <div className="error">{error}</div>}

      <div className="sticky-actions">
        <button type="button" className="btn" onClick={cancel}>
          Annuler
        </button>
        <button type="button" className="btn btn-primary grow" disabled={saving} onClick={save}>
          Enregistrer la séance
        </button>
      </div>
    </>
  );
}
