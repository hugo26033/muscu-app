import { useMemo, useState } from 'react';
import type { ExerciseType, SessionExercise } from '../db';
import { formatDate, formatShortDate } from '../lib/format';
import {
  formatMetric,
  metricPoints,
  metricsFor,
  RANGES,
  rangeStart,
  roundMetric,
  type Metric,
  type MetricId,
  type MetricPoint,
  type RangeId,
} from '../lib/stats';
import ProgressChart from './ProgressChart';

interface Props {
  entries: SessionExercise[];
  type: ExerciseType;
}

export default function ExerciseProgress({ entries, type }: Props) {
  const metrics = useMemo(() => metricsFor(type, entries), [type, entries]);
  const [metricId, setMetricId] = useState<MetricId>(metrics[0].id);
  const [rangeId, setRangeId] = useState<RangeId>('all');
  const metric = metrics.find((m) => m.id === metricId) ?? metrics[0];

  const start = rangeStart(rangeId);
  const points = useMemo(
    () => metricPoints(entries, metric).filter((p) => p.date >= start),
    [entries, metric, start],
  );

  if (entries.length === 0) return null;

  const last = points.at(-1);
  const previous = points.at(-2);
  const best = points.reduce<MetricPoint | undefined>((b, p) => (!b || p.value > b.value ? p : b), undefined);
  const format = (value: number) => formatMetric(metric, value);

  const ariaLabel = last
    ? `${metric.label} sur ${points.length} séance(s), du ${formatDate(points[0].date)} au ${formatDate(last.date)}. ` +
      `Dernière valeur ${format(last.value)}, meilleure ${format(best!.value)}.`
    : `${metric.label} : aucune donnée`;

  return (
    <section className="progress">
      <h2>Progression</h2>

      <div className="segmented" role="tablist" aria-label="Indicateur">
        {metrics.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === metric.id}
            className={m.id === metric.id ? 'active' : ''}
            onClick={() => setMetricId(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="segmented segmented-small" role="radiogroup" aria-label="Période">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={r.id === rangeId}
            className={r.id === rangeId ? 'active' : ''}
            onClick={() => setRangeId(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="muted small metric-description">{metric.description}.</p>

      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="stat-label">Dernière séance</div>
          <div className="stat-value">{last ? format(last.value) : '—'}</div>
          {last && previous && <Delta metric={metric} current={last} previous={previous} />}
        </div>
        <div className="stat-tile">
          <div className="stat-label">{rangeId === 'all' ? 'Record' : 'Meilleure (période)'}</div>
          <div className="stat-value">{best ? format(best.value) : '—'}</div>
          {best && <div className="stat-detail muted">le {formatShortDate(best.date)}</div>}
        </div>
      </div>

      <div className="card chart-card">
        {points.length === 0 ? (
          <p className="empty">Aucune séance sur cette période.</p>
        ) : (
          <ProgressChart key={`${metric.id}-${rangeId}`} points={points} formatValue={format} ariaLabel={ariaLabel} />
        )}
        {points.length === 1 && (
          <p className="muted small chart-hint">Une seule séance sur la période : la courbe se dessinera dès la suivante.</p>
        )}
      </div>

      {points.length > 0 && (
        <details className="chart-table">
          <summary>Voir les valeurs</summary>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">{metric.label}</th>
                  <th scope="col">Écart</th>
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((point, i, list) => {
                  const before = list[i + 1];
                  return (
                    <tr key={point.sessionId}>
                      <td>{formatDate(point.date, { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                      <td>{format(point.value)}</td>
                      <td>{before ? signedDiff(metric, point.value - before.value) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function signedDiff(metric: Metric, diff: number) {
  const rounded = roundMetric(metric, diff);
  if (rounded === 0) return '=';
  return `${rounded > 0 ? '+' : '−'}${formatMetric(metric, Math.abs(rounded))}`;
}

function Delta({ metric, current, previous }: { metric: Metric; current: MetricPoint; previous: MetricPoint }) {
  const rounded = roundMetric(metric, current.value - previous.value);
  const since = <span className="muted"> vs {formatShortDate(previous.date)}</span>;
  if (rounded === 0) {
    return <div className="stat-detail">= stable{since}</div>;
  }
  return (
    <div className={`stat-detail ${rounded > 0 ? 'delta-up' : 'delta-down'}`}>
      {rounded > 0 ? '▲ ' : '▼ '}
      {signedDiff(metric, rounded)}
      {since}
    </div>
  );
}
