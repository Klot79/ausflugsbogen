import { NEGATIVE_CRITERIA } from './criteria';
import { addDays, today } from './dates';
import {
  SCHEMA_VERSION,
  type AppData,
  type Decision,
  type NegativeCode,
  type RecommendationTexts,
  type Settings,
} from './types';

export const DEFAULT_STUFE: [number, number, number] = [1, 3, 5];
/** gelb, orange, rot */
export const DEFAULT_AMPEL: [number, number, number] = [10, 20, 30];
export const DEFAULT_SAFETY = 3;
export const DEFAULT_BONUS_CAP = 8;

export const DEFAULT_TEXTS: RecommendationTexts = {
  gruen: 'Teilnahme ohne Auflagen empfohlen.',
  gelb: 'Teilnahme empfohlen. Vor dem Ausflug eine klare Vereinbarung mit Kind und Eltern treffen.',
  orange:
    'Teilnahme nur mit Auflagen empfohlen, zum Beispiel feste Begleitperson oder Abholung bei Regelverstoß. Elterngespräch vor dem Ausflug.',
  rot: 'Ausschluss vom Ausflug prüfen. Elterngespräch und Absprache mit der Schulleitung vor dem Ausflug.',
  safety:
    'Sicherheit prüfen: Es gibt mehrere Einträge im Bereich Sicherheit. Aufsicht und Begleitung am Ausflugstag gesondert klären.',
};

export function defaultWeights(): Record<NegativeCode, number> {
  return Object.fromEntries(NEGATIVE_CRITERIA.map((c) => [c.code, c.defaultWeight])) as Record<
    NegativeCode,
    number
  >;
}

/** Default settings. The observation period starts six weeks before `now` and stays open. */
export function defaultSettings(now: Date = new Date()): Settings {
  const t = today(now);
  return {
    trip: '',
    tripDate: addDays(t, 28),
    from: addDays(t, -42),
    to: '',
    by: '',
    stufe: [...DEFAULT_STUFE],
    ampel: [...DEFAULT_AMPEL],
    safety: DEFAULT_SAFETY,
    bonusCap: DEFAULT_BONUS_CAP,
    weights: defaultWeights(),
    texts: { ...DEFAULT_TEXTS },
  };
}

/** Resets only the rules (stages, thresholds, weights, texts). Trip and period stay. */
export function resetRules(s: Settings): Settings {
  return {
    ...s,
    stufe: [...DEFAULT_STUFE],
    ampel: [...DEFAULT_AMPEL],
    safety: DEFAULT_SAFETY,
    bonusCap: DEFAULT_BONUS_CAP,
    weights: defaultWeights(),
    texts: { ...DEFAULT_TEXTS },
  };
}

export function emptyDecision(): Decision {
  return { talkDate: '', conditions: '', decision: 'offen', reason: '', care: '' };
}

export function emptyAppData(now: Date = new Date()): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(now),
    kids: [],
    incidents: [],
    decisions: {},
    meta: { lastBackup: null, installHintDismissed: false },
  };
}
