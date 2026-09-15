import { toISODate } from './format';

export interface CalendarDay {
  date: string;
  inMonth: boolean;
}

/** Jour de la semaine 0=lundi…6=dimanche (contrairement à Date#getDay, qui commence au dimanche). */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

/** Grille du mois en semaines de 7 jours (lundi en premier), sans lignes finales hors mois. */
export function monthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - mondayIndex(first));
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: toISODate(d), inMonth: d.getMonth() === month });
  }
  while (days.length > 28 && days.slice(-7).every((d) => !d.inMonth)) days.splice(-7);
  return days;
}

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function monthLabel(year: number, month: number) {
  const label = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Lundi 00:00 de la semaine contenant la date donnée. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - mondayIndex(d));
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function weekRange(monday: Date) {
  return { start: toISODate(monday), end: toISODate(addDays(monday, 6)) };
}

export function weekLabel(monday: Date) {
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(addDays(monday, 6))}`;
}
