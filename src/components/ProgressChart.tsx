import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { formatDate, formatNumber } from '../lib/format';

export interface ChartPoint {
  date: string;
  value: number;
}

interface Props {
  points: ChartPoint[];
  formatValue: (value: number) => string;
  ariaLabel: string;
}

const HEIGHT = 220;
const MARGIN = { top: 28, right: 14, bottom: 28 };
const MAX_DOTS = 30;

const toTime = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Graduations « rondes » (pas de 1, 2 ou 5 × 10ⁿ) couvrant [min, max]. */
function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * magnitude;
  const ticks: number[] = [];
  for (let i = Math.floor(min / step); i <= Math.ceil(max / step); i++) ticks.push(i * step);
  return ticks;
}

/** Courbe d'une série dans le temps : repère vertical + bulle au survol, au toucher ou au clavier (← →). */
export default function ProgressChart({ points, formatValue, ariaLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const tickLabels = ticks.map((t) => formatNumber(t));
  const left = Math.max(28, Math.max(...tickLabels.map((l) => l.length)) * 7 + 12);
  const plotWidth = Math.max(0, width - left - MARGIN.right);
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const plotBottom = MARGIN.top + plotHeight;

  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const y = (value: number) => plotBottom - ((value - yMin) / (yMax - yMin)) * plotHeight;

  const times = points.map((p) => toTime(p.date));
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const x = (time: number) => (tMax === tMin ? left + plotWidth / 2 : left + ((time - tMin) / (tMax - tMin)) * plotWidth);

  const xs = times.map(x);
  const ys = values.map(y);
  const lastIndex = points.length - 1;
  const bestIndex = values.indexOf(Math.max(...values));

  const spanDays = (tMax - tMin) / 86_400_000;
  const tickDate = (time: number) =>
    new Date(time).toLocaleDateString(
      'fr-FR',
      spanDays > 300 ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' },
    );
  const xTicks: { time: number; anchor: 'start' | 'middle' | 'end' }[] = [];
  if (tMax === tMin) {
    xTicks.push({ time: tMin, anchor: 'middle' });
  } else {
    xTicks.push({ time: tMin, anchor: 'start' });
    if (plotWidth > 220) xTicks.push({ time: (tMin + tMax) / 2, anchor: 'middle' });
    xTicks.push({ time: tMax, anchor: 'end' });
  }

  // Étiquettes directes : dernière valeur, et record s'il est plus haut. Quand les deux points sont proches,
  // la dernière valeur passe sous son point ; s'il n'y a pas la place, le record reste lisible dans la tuile.
  const labelAnchor = (px: number) => (px > width - MARGIN.right - 36 ? 'end' : px < left + 36 ? 'start' : 'middle');
  const labels = [{ index: lastIndex, below: ys[lastIndex] - 10 < 12 }];
  if (values[bestIndex] > values[lastIndex]) {
    const near = Math.abs(xs[bestIndex] - xs[lastIndex]) < 70;
    const roomBelow = ys[lastIndex] + 20 <= plotBottom - 4;
    if (near && roomBelow) labels[0].below = true;
    if (!near || roomBelow) labels.push({ index: bestIndex, below: ys[bestIndex] - 10 < 12 });
  }

  const selectNearest = (event: PointerEvent<SVGSVGElement>) => {
    const px = event.clientX - event.currentTarget.getBoundingClientRect().left;
    let nearest = 0;
    xs.forEach((value, i) => {
      if (Math.abs(value - px) < Math.abs(xs[nearest] - px)) nearest = i;
    });
    setActive(nearest);
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'Escape') return setActive(null);
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowRight' ? 1 : -1;
    setActive((current) => clamp(current === null ? (step > 0 ? 0 : lastIndex) : current + step, 0, lastIndex));
  };

  const line = xs.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${ys[i].toFixed(1)}`).join('');
  const showAllDots = points.length <= MAX_DOTS;
  // Bulle du côté opposé au point pour ne pas le masquer.
  const tooltipTop = active !== null && ys[active] < MARGIN.top + plotHeight / 2 ? plotBottom - 52 : 0;

  return (
    <div ref={containerRef} className="progress-chart">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerDown={selectNearest}
          onPointerMove={selectNearest}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        >
          {ticks.map((tick, i) => (
            <g key={tick}>
              <line
                className={i === 0 ? 'chart-baseline' : 'chart-grid'}
                x1={left}
                x2={width - MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="chart-tick" x={left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
                {tickLabels[i]}
              </text>
            </g>
          ))}
          {xTicks.map(({ time, anchor }) => (
            <text key={time} className="chart-tick" x={x(time)} y={HEIGHT - 8} textAnchor={anchor}>
              {tickDate(time)}
            </text>
          ))}

          {active !== null && (
            <line className="chart-crosshair" x1={xs[active]} x2={xs[active]} y1={MARGIN.top - 8} y2={plotBottom} />
          )}

          <path className="chart-line" d={line} />

          {xs.map((px, i) =>
            showAllDots || i === lastIndex || i === bestIndex ? (
              <circle key={i} className="chart-dot" cx={px} cy={ys[i]} r={4} />
            ) : null,
          )}
          {active !== null && <circle className="chart-dot" cx={xs[active]} cy={ys[active]} r={6} />}

          {active === null &&
            labels.map(({ index: i, below }) => (
              <text key={i} className="chart-label" x={xs[i]} y={below ? ys[i] + 20 : ys[i] - 10} textAnchor={labelAnchor(xs[i])}>
                {formatValue(values[i])}
              </text>
            ))}
        </svg>
      )}

      {active !== null && (
        <div
          className="chart-tooltip"
          role="status"
          style={{ left: clamp(xs[active], 72, width - 72), top: tooltipTop }}
        >
          <strong>{formatValue(values[active])}</strong>
          <span>{formatDate(points[active].date)}</span>
        </div>
      )}
    </div>
  );
}
