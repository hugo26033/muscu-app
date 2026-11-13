import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { compareSessionsDesc, db, MUSCLE_GROUPS, type MuscleGroup, type Session, type SetEntry, type ExerciseType } from '../db';
import { addDays, startOfWeek, weekLabel, weekRange } from '../lib/dates';
import { formatSet, formatShortDate, plural } from '../lib/format';
import { MUSCLE_GROUP_COLORS } from '../lib/muscleColors';

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
  const { start, end } = weekRange(monday);

  const toggleGroup = (group: MuscleGroup) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const data = useLiveQuery(async () => {
    const sessions = (await db.sessions.where('date').between(start, end, true, true).toArray()).sort(compareSessionsDesc);
    const sessionMap = new Map(sessions.map((s) => [s.id, s]));
    const entries = await db.sessionExercises
      .where('sessionId')
      .anyOf(sessions.map((s) => s.id))
      .toArray();
    entries.sort((a, b) => a.position - b.position);

    const exerciseIds = [...new Set(entries.map((e) => e.exerciseId))];
    const exercises = await db.exercises.bulkGet(exerciseIds);
    const exerciseMap = new Map(exercises.filter((e) => e !== undefined).map((e) => [e.id, e]));

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
        exercises: [...bucket.exercises.values()].sort((a, b) => b.sets - a.sets),
        sessions: [...bucket.sessions.values()].sort((a, b) => compareSessionsDesc(a.session, b.session)),
      };
    }).sort((a, b) => b.sets - a.sets);

    return { rows, unclassifiedSets };
  }, [start, end]);

  const isCurrentWeek = monday.getTime() === startOfWeek(new Date()).getTime();

  return (
    <>
      <header className="page-header">
        <h1>Muscles</h1>
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
        {data?.rows.map(({ group, sets, exercises, sessions }) => {
          const color = MUSCLE_GROUP_COLORS[group];
          const isOpen = sets > 0 && expanded.has(group);
          return (
            <li key={group}>
              <div className="card">
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
                        <span className="badge" style={{ background: `${color}26`, color, borderColor: `${color}4d` }}>
                          {plural(sets, 'série')}
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
                    <span className="muted small">{plural(sets, 'série')}</span>
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
