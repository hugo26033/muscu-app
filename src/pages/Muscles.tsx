import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { db, MUSCLE_GROUPS, type MuscleGroup } from '../db';
import { addDays, startOfWeek, weekLabel, weekRange } from '../lib/dates';
import { plural } from '../lib/format';
import { MUSCLE_GROUP_COLORS } from '../lib/muscleColors';

export default function Muscles() {
  const [monday, setMonday] = useState(() => startOfWeek(new Date()));
  const { start, end } = weekRange(monday);

  const data = useLiveQuery(async () => {
    const sessions = await db.sessions.where('date').between(start, end, true, true).toArray();
    const entries = await db.sessionExercises
      .where('sessionId')
      .anyOf(sessions.map((s) => s.id))
      .toArray();
    const exerciseIds = [...new Set(entries.map((e) => e.exerciseId))];
    const exercises = await db.exercises.bulkGet(exerciseIds);
    const exerciseMap = new Map(exercises.filter((e) => e !== undefined).map((e) => [e.id, e]));

    const perGroup = new Map<MuscleGroup, { sets: number; exercises: Map<number, { name: string; sets: number }> }>();
    for (const group of MUSCLE_GROUPS) perGroup.set(group, { sets: 0, exercises: new Map() });

    let unclassifiedSets = 0;
    for (const entry of entries) {
      const exercise = exerciseMap.get(entry.exerciseId);
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
      }
    }

    const rows = MUSCLE_GROUPS.map((group) => {
      const bucket = perGroup.get(group)!;
      return { group, sets: bucket.sets, exercises: [...bucket.exercises.values()].sort((a, b) => b.sets - a.sets) };
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
        {data?.rows.map(({ group, sets, exercises }) => {
          const color = MUSCLE_GROUP_COLORS[group];
          return (
            <li key={group}>
              <div className="card">
                <div className="card-row">
                  <strong className="muscle-name">
                    <span className="muscle-dot" style={{ background: color }} aria-hidden />
                    {group}
                  </strong>
                  <span
                    className={sets > 0 ? 'badge' : 'muted small'}
                    style={sets > 0 ? { background: `${color}26`, color } : undefined}
                  >
                    {plural(sets, 'série')}
                  </span>
                </div>
                {exercises.length > 0 && (
                  <div className="muted small clamp">
                    {exercises.map((e) => `${e.name} (${plural(e.sets, 'série')})`).join(' · ')}
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
