import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { compareSessionsDesc, db, type Session } from '../db';
import { monthGrid, monthLabel, WEEKDAY_LABELS } from '../lib/dates';
import { todayISO } from '../lib/format';

export default function Calendar() {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const days = monthGrid(cursor.year, cursor.month);
  const rangeStart = days[0].date;
  const rangeEnd = days[days.length - 1].date;

  const sessions = useLiveQuery(async () => {
    const list = await db.sessions.where('date').between(rangeStart, rangeEnd, true, true).toArray();
    return list.sort(compareSessionsDesc);
  }, [rangeStart, rangeEnd]);

  const byDate = new Map<string, Session[]>();
  for (const session of sessions ?? []) {
    const list = byDate.get(session.date);
    if (list) list.push(session);
    else byDate.set(session.date, [session]);
  }

  const today = todayISO();
  const changeMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };
  const isCurrentMonth = (() => {
    const d = new Date();
    return cursor.year === d.getFullYear() && cursor.month === d.getMonth();
  })();

  return (
    <>
      <header className="page-header">
        <h1>Calendrier</h1>
      </header>

      <div className="period-nav">
        <button type="button" className="btn" onClick={() => changeMonth(-1)} aria-label="Mois précédent">
          ‹
        </button>
        <span className="big period-label">{monthLabel(cursor.year, cursor.month)}</span>
        <button type="button" className="btn" onClick={() => changeMonth(1)} aria-label="Mois suivant">
          ›
        </button>
      </div>
      {!isCurrentMonth && (
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => {
            const d = new Date();
            setCursor({ year: d.getFullYear(), month: d.getMonth() });
          }}
        >
          Mois actuel
        </button>
      )}

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map(({ date, inMonth }) => {
          const daySessions = byDate.get(date) ?? [];
          return (
            <div key={date} className={`calendar-cell${inMonth ? '' : ' out'}${date === today ? ' today' : ''}`}>
              <span className="calendar-day-number">{Number(date.slice(8, 10))}</span>
              {daySessions.length > 0 && (
                <div className="calendar-sessions">
                  {daySessions.map((session) => (
                    <Link key={session.id} to={`/seance/${session.id}`} className="calendar-session">
                      {session.templateName || 'Séance'}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
