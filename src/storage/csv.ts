import { today } from '../domain/dates';
import { sortKidsByName } from '../domain/kids';
import { AMPEL_LABELS, scoreKid } from '../domain/scoring';
import { DECISION_LABELS, type AppData } from '../domain/types';

const SEP = ';';

/** Quotes a CSV cell. Also neutralises formula injection (=, +, -, @ at the start). */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Class overview as CSV (semicolon separated, UTF-8 with BOM) so Excel and Numbers
 * open it correctly with German settings.
 */
export function classCsv(data: AppData): string {
  const header = [
    'Name',
    'Beispiel',
    'Ampel',
    'Rohpunkte',
    'Bonus',
    'Netto',
    'Einträge im Zeitraum',
    'Sicherheit prüfen',
    'Entscheidung',
  ];
  const rows = sortKidsByName(data.kids).map((kid) => {
    const r = scoreKid(kid.id, data.incidents, data.settings);
    const decision = data.decisions[kid.id]?.decision ?? 'offen';
    return [
      kid.name,
      kid.demo ? 'ja' : 'nein',
      AMPEL_LABELS[r.ampel],
      r.raw,
      r.bonus,
      r.net,
      r.entriesInPeriod,
      r.safetyCheck ? 'ja' : 'nein',
      DECISION_LABELS[decision],
    ];
  });
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(SEP));
  return '﻿' + lines.join('\r\n') + '\r\n';
}

export function csvFileName(now: Date = new Date()): string {
  return `ausflugsbogen-klasse-${today(now)}.csv`;
}
