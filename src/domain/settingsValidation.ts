import { isValidDateString } from './dates';
import { NEGATIVE_CODES, type Settings } from './types';

function isInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n);
}

function ascending(values: readonly number[]): boolean {
  return values.every((v, i) => i === 0 || v > (values[i - 1] as number));
}

/** Returns visible warnings for the settings screen. Empty list = everything fine. */
export function validateSettings(s: Settings): string[] {
  const w: string[] = [];

  if (!s.stufe.every((v) => isInt(v) && v >= 1)) {
    w.push('Stufengrenzen müssen ganze Zahlen ab 1 sein.');
  } else if (!ascending(s.stufe)) {
    w.push('Stufengrenzen müssen aufsteigend sein (Stufe 1 < Stufe 2 < Stufe 3).');
  }

  if (!s.ampel.every((v) => isInt(v) && v >= 0)) {
    w.push('Ampel-Schwellen müssen ganze Zahlen ab 0 sein.');
  } else if (!ascending(s.ampel)) {
    w.push('Ampel-Schwellen müssen aufsteigend sein (Gelb < Orange < Rot).');
  }

  if (!isInt(s.safety) || s.safety < 0) {
    w.push('Sicherheitsschwelle muss eine ganze Zahl ab 0 sein (0 = aus).');
  }
  if (!isInt(s.bonusCap) || s.bonusCap < 0) {
    w.push('Bonus-Obergrenze muss eine ganze Zahl ab 0 sein.');
  }

  const badWeights = NEGATIVE_CODES.filter((c) => {
    const v = s.weights[c];
    return !isInt(v) || v < 1 || v > 5;
  });
  if (badWeights.length > 0) {
    w.push(`Gewichte müssen zwischen 1 und 5 liegen (betrifft ${badWeights.join(', ')}).`);
  }

  if (s.from && !isValidDateString(s.from)) w.push('Startdatum ist ungültig.');
  if (s.to && !isValidDateString(s.to)) w.push('Enddatum ist ungültig.');
  if (s.from && s.to && s.to < s.from) {
    w.push('Das Enddatum liegt vor dem Startdatum des Beobachtungszeitraums.');
  }
  if (s.tripDate && !isValidDateString(s.tripDate)) w.push('Datum des Ausflugs ist ungültig.');

  return w;
}
