import { formatDate } from '../../domain/dates';
import type { Settings } from '../../domain/types';

export function periodText(s: Settings): string {
  if (!s.from && !s.to) return 'Beobachtungszeitraum: alle Einträge';
  if (!s.to) return `Beobachtungszeitraum: ab ${formatDate(s.from)} (offen)`;
  if (!s.from) return `Beobachtungszeitraum: bis ${formatDate(s.to)}`;
  return `Beobachtungszeitraum: ${formatDate(s.from)} bis ${formatDate(s.to)}`;
}

export function PeriodLine({ settings }: { settings: Settings }) {
  return <span class="period">{periodText(settings)}</span>;
}
