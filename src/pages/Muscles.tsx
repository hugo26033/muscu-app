import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { compareSessionsDesc, db, MUSCLE_GROUPS, type MuscleGroup, type Session, type SetEntry, type ExerciseType } from '../db';
import { addDays, startOfWeek, weekLabel, weekRange } from '../lib/dates';
import { formatSet, formatShortDate, plural } from '../lib/format';
import { MUSCLE_GROUP_COLORS } from '../lib/muscleColors';
import { loadMuscleTargets, saveMuscleTargets, type MuscleTargets } from '../lib/muscleTargets';

interface MuscleSessionEntry {
  exerciseId: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  sets: SetEntry[];
}

interface MuscleSessionDetail {
  session: Session;
  entries: MuscleSessionEntry[];
}

export default function Muscles() {
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const [expanded, setExpanded] = useState<Set<MuscleGroup>>(() => new Set());
  const [editingTargets, setEditingTargets] = useState(false);
  const [targets, setTargets] = useState<MuscleTargets>(loadMuscleTargets);
  const { start, end } = weekRange(monday);
  const { start: prevStart, end: prevEnd } = weekRange(addDays(monday, -7));

  const toggleGroup = (group: MuscleGroup) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const updateTarget = (group: MuscleGroup, raw: string) => {
    const num = Number(raw);
    const next: MuscleTargets = { ...targets };
    if (raw.trim() === '' || !Number.isInteger(num) || num < 1) {
      delete next[group];
    } else {
      next[group] = Math.min(99, num);
    }
    setTargets(next);
    saveMuscleTargets(next);
  };

  const data = useLiveQuery(async () => {
    const [sessions, prevSessions] = await Promise.all([
      db.sessions.where('date').between(start, end, true, true).toArray(),
      db.sessions.where('date').between(prevStart, prevEnd, true, true).toArray(),
    ]);
    sessions.sort(compareSessionsDesc);
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    const [entries, prevEntries] = await Promise.all([
      db.sessionExercises.where('sessionId').anyOf(sessions.map((s) => s.id)).toArray(),
      db.sessionExercises.where('sessionId').anyOf(prevSessions.map((s) => s.id)).toArray(),
    ]);
    entries.sort((a, b) => a.position - b.position);

    const exerciseIds = [...new Set([...entries.map((e) => e.exerciseId), ...prevEntries.map((e) => e.exerciseId)])];
    const exercises = await db.exercises.bulkGet(exerciseIds);
    const exerciseMap = new Map(exercises.filter((e) => e !== undefined).map((e) => [e.id, e]));

    const prevSetsPerGroup = new Map<MuscleGroup, number>();
    for (const group of MUSCLE_GROUPS) prevSetsPerGroup.set(group, 0);
    for (const entry of prevEntries) {
      const groups = exerciseMap.get(entry.exerciseId)?.muscleGroups ?? [];
      for (const group of groups) {
        prevSetsPerGroup.set(group, (prevSetsPerGroup.get(group) ?? 0) + entry.sets.length);
      }
    }

    const perGroup = new Map<
      MuscleGroup,
      {
        sets: number;
        exercises: Map<number, { name: string; sets: number }>;
        sessions: Map<number, MuscleSessionDetail>;
      }
    >();
    for (const group of MUSCLE_GROUPS) perGroup.set(group, { sets: 0, exercises: new Map(), sessions: new Map() });

    let unclassifiedSets = 0;
    for (const entry of entries) {
      const exercise = exerciseMap.get(entry.exerciseId);
      const session = sessionMap.get(entry.sessionId);
      const groups = exercise?.muscleGroups ?? [];
      if (!exercise || groups.length === 0) {
        unclassifiedSets += entry.sets.length;
        continue;
      }
      for (const group of groups) {
        const bucket = perGroup.get(group)!;
        bucket.sets += entry.sets.length;
        const stat = bucket.exercises.get(exercise.id) ?? { name: exercise.name, sets: 0 };
        stat.sets += entry.sets.length;
        bucket.exercises.set(exercise.id, stat);

        if (session) {
          let detail = bucket.sessions.get(session.id);
          if (!detail) {
            detail = { session, entries: [] };
            bucket.sessions.set(session.id, detail);
          }
          detail.entries.push({
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            exerciseType: exercise.type,
            sets: entry.sets,
          });
        }
      }
    }

    const rows = MUSCLE_GROUPS.map((group) => {
      const bucket = perGroup.get(group)!;
      return {
        group,
        sets: bucket.sets,
        prevSets: prevSetsPerGroup.get(group) ?? 0,
        exercises: [...bucket.exercises.values()].sort((a, b) => b.sets - a.sets),
        sessions: [...bucket.sessions.values()].sort((a, b) => compareSessionsDesc(a.session, b.session)),
      };
    }).sort((a, b) => b.sets - a.sets);

    return { rows, unclassifiedSets };
  }, [start, end, prevStart, prevEnd]);

  const isCurrentWeek = monday.getTime() === startOfWeek(new Date()).getTime();

  return (
    <>
      <header className="page-header">
        <h1>Muscles</h1>
        <button
          type="button"
          className={editingTargets ? 'btn btn-primary' : 'btn'}
          onClick={() => setEditingTargets((v) => !v)}
        >
          {editingTargets ? 'Terminer' : 'Objectifs'}
        </button>
      </header>

      <div className="period-nav">
        <button type="button" className="btn" onClick={() => setMonday((m) => addDays(m, -7))} aria-label="Semaine précédente">
          ‹
        </button>
        <span className="big period-label">{weekLabel(monday)}</span>
        <button type="button" className="btn" onClick={() => setMonday((m) => addDays(m, 7))} aria-label="Semaine suivante">
          ›
        </button>
      </div>
      {!isCurrentWeek && (
        <button type="button" className="btn btn-ghost btn-block" onClick={() => setMonday(startOfWeek(new Date()))}>
          Semaine actuelle
        </button>
      )}

      <ul className="list">
        {data?.rows.map(({ group, sets, prevSets, exercises, sessions }) => {
          const color = MUSCLE_GROUP_COLORS[group];
          const target = targets[group];
          const delta = sets - prevSets;
          const pct = target ? Math.min(100, Math.round((sets / target) * 100)) : 0;
          const isOpen = !editingTargets && sets > 0 && expanded.has(group);
          const badgeText = target ? `${sets} / ${target} séries` : plural(sets, 'série');
          const deltaLabel =
            prevSets > 0 || sets > 0 ? (delta > 0 ? `+${delta}` : delta < 0 ? String(delta) : '=') : null;
          const deltaClass = delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : 'muted';

          return (
            <li key={group}>
              <div className="card">
                {editingTargets ? (
                  <div className="card-row muscle-target-row">
                    <strong className="muscle-name">
                      <span className="muscle-dot" style={{ background: color }} aria-hidden />
                      {group}
                    </strong>
                    <label className="muscle-target-field">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={99}
                        placeholder="—"
                        aria-label={`Objectif hebdomadaire pour ${group}`}
                        value={target ?? ''}
                        onChange={(e) => updateTarget(group, e.target.value)}
                      />
                      <span className="muted small">séries/sem</span>
                    </label>
                  </div>
                ) : (
                  <>
                    {sets > 0 ? (
                      <button
                        type="button"
                        className="muscle-toggle"
                        aria-expanded={isOpen}
                        onClick={() => toggleGroup(group)}
                      >
                        <div className="card-row">
                          <strong className="muscle-name">
                            <span className="muscle-dot" style={{ background: color }} aria-hidden />
                            {group}
                          </strong>
                          <span className="muscle-meta">
                            {deltaLabel && prevSets > 0 && (
                              <span className={`small nowrap ${deltaClass}`} title={`Semaine précédente : ${prevSets}`}>
                                {deltaLabel}
                              </span>
                            )}
                            <span className="badge" style={{ background: `${color}26`, color, borderColor: `${color}4d` }}>
                              {badgeText}
                            </span>
                            <span className="muted small" aria-hidden>
                              {isOpen ? '▾' : '▸'}
                            </span>
                          </span>
                        </div>
                        {!isOpen && exercises.length > 0 && (
                          <div className="muted small clamp">
                            {exercises.map((e) => `${e.name} (${plural(e.sets, 'série')})`).join(' · ')}
                          </div>
                        )}
                      </button>
                    ) : (
                      <div className="card-row">
                        <strong className="muscle-name">
                          <span className="muscle-dot" style={{ background: color }} aria-hidden />
                          {group}
                        </strong>
                        <span className="muscle-meta">
                          {deltaLabel && prevSets > 0 && (
                            <span className={`small nowrap ${deltaClass}`} title={`Semaine précédente : ${prevSets}`}>
                              {deltaLabel}
                            </span>
                          )}
                          <span className="muted small">{badgeText}</span>
                        </span>
                      </div>
                    )}

                    {target && (
                      <div className="muscle-progress-track" aria-hidden>
                        <div
                          className="muscle-progress-bar"
                          style={{
                            width: `${pct}%`,
                            background: sets >= target ? 'var(--up)' : color,
                          }}
                        />
                      </div>
                    )}

                    {isOpen && (
                      <div className="muscle-details">
                        {sessions.map(({ session, entries }) => (
                          <div key={session.id} className="muscle-session">
                            <Link to={`/seance/${session.id}`} className="muscle-session-link">
                              <strong>{session.templateName || 'Séance libre'}</strong>
                              <span className="muted small">{formatShortDate(session.date)} ›</span>
                            </Link>
                            {entries.map((entry, idx) => (
                              <div key={`${entry.exerciseId}-${idx}`} className="muscle-exercise">
                                <Link to={`/exercices/${entry.exerciseId}`} className="small muted">
                                  {entry.exerciseName}
                                </Link>
                                <ul className="set-list">
                                  {entry.sets.map((s, sIdx) => (
                                    <li key={sIdx} className="set-chip">
                                      {formatSet(s, entry.exerciseType)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {data && data.unclassifiedSets > 0 && (
        <p className="muted small">
          {plural(data.unclassifiedSets, 'série')} sur des exercices non classés cette semaine —{' '}
          <Link to="/exercices">renseigner les groupes musculaires</Link>.
        </p>
      )}
    </>
  );
}
