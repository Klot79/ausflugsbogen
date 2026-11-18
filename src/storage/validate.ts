/*
 * Strict validation of stored or imported data. Builds fresh objects and drops unknown
 * properties, so a foreign or manipulated file can never inject unexpected values.
 */
import { isCriterionCode } from '../domain/criteria';
import { isValidDateString } from '../domain/dates';
import { defaultSettings } from '../domain/defaults';
import {
  BY_MAX,
  DECISION_VALUES,
  NAME_MAX,
  NEGATIVE_CODES,
  NOTE_MAX,
  SCHEMA_VERSION,
  type AppData,
  type Decision,
  type DecisionValue,
  type Incident,
  type Kid,
  type Settings,
} from '../domain/types';

export class DataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataError';
  }
}

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, field: string, max = 2000): string {
  if (typeof v !== 'string') throw new DataError(`Feld "${field}" fehlt oder ist kein Text.`);
  return v.slice(0, max);
}

function optDate(v: unknown, field: string): string {
  if (v === '' || v === undefined || v === null) return '';
  if (!isValidDateString(v)) throw new DataError(`Feld "${field}" ist kein gültiges Datum.`);
  return v;
}

function int(v: unknown, field: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new DataError(`Feld "${field}" ist keine gültige Zahl.`);
  }
  return v;
}

function triple(v: unknown, field: string): [number, number, number] {
  if (!Array.isArray(v) || v.length !== 3) throw new DataError(`Feld "${field}" ist ungültig.`);
  return [int(v[0], field, 0, 999), int(v[1], field, 0, 999), int(v[2], field, 0, 999)];
}

function settings(v: unknown): Settings {
  if (!isObj(v)) throw new DataError('Einstellungen fehlen.');
  const d = defaultSettings();
  const w = isObj(v.weights) ? v.weights : {};
  const weights = { ...d.weights };
  for (const code of NEGATIVE_CODES) {
    if (w[code] !== undefined) weights[code] = int(w[code], `Gewicht ${code}`, 1, 5);
  }
  const t = isObj(v.texts) ? v.texts : {};
  const texts = { ...d.texts };
  for (const k of ['gruen', 'gelb', 'orange', 'rot', 'safety'] as const) {
    if (t[k] !== undefined) texts[k] = str(t[k], `Text ${k}`, 1000);
  }
  return {
    trip: str(v.trip ?? '', 'Ausflug', 120),
    tripDate: optDate(v.tripDate, 'Datum des Ausflugs'),
    from: optDate(v.from, 'Zeitraum von'),
    to: optDate(v.to, 'Zeitraum bis'),
    by: str(v.by ?? '', 'Kürzel', BY_MAX),
    stufe: v.stufe === undefined ? d.stufe : triple(v.stufe, 'Stufen'),
    ampel: v.ampel === undefined ? d.ampel : triple(v.ampel, 'Ampel'),
    safety: v.safety === undefined ? d.safety : int(v.safety, 'Sicherheitsschwelle', 0, 999),
    bonusCap: v.bonusCap === undefined ? d.bonusCap : int(v.bonusCap, 'Bonus-Obergrenze', 0, 999),
    weights,
    texts,
  };
}

function kid(v: unknown): Kid {
  if (!isObj(v)) throw new DataError('Ein Kind-Eintrag ist ungültig.');
  const name = str(v.name, 'Name', NAME_MAX).trim();
  if (!name) throw new DataError('Ein Kind hat keinen Namen.');
  return { id: str(v.id, 'Kind-ID', 100), name, demo: v.demo === true };
}

function incident(v: unknown, kidIds: Set<string>): Incident {
  if (!isObj(v)) throw new DataError('Ein Eintrag ist ungültig.');
  if (!isCriterionCode(v.code)) throw new DataError('Ein Eintrag hat ein unbekanntes Kriterium.');
  if (!isValidDateString(v.date)) throw new DataError('Ein Eintrag hat kein gültiges Datum.');
  const kidId = str(v.kidId, 'Kind-ID', 100);
  if (!kidIds.has(kidId)) throw new DataError('Ein Eintrag gehört zu keinem bekannten Kind.');
  return {
    id: str(v.id, 'Eintrag-ID', 100),
    kidId,
    code: v.code,
    date: v.date,
    note: str(v.note ?? '', 'Notiz', NOTE_MAX),
    by: str(v.by ?? '', 'Beobachtet von', BY_MAX),
    createdAt: str(v.createdAt ?? '', 'Erfasst am', 40),
  };
}

function decision(v: unknown): Decision {
  if (!isObj(v)) throw new DataError('Eine Entscheidung ist ungültig.');
  const value = v.decision ?? 'offen';
  if (!DECISION_VALUES.includes(value as DecisionValue)) {
    throw new DataError('Eine Entscheidung hat einen unbekannten Wert.');
  }
  return {
    talkDate: optDate(v.talkDate, 'Datum Elterngespräch'),
    conditions: str(v.conditions ?? '', 'Auflagen', 2000),
    decision: value as DecisionValue,
    reason: str(v.reason ?? '', 'Begründung', 2000),
    care: str(v.care ?? '', 'Betreuung', 1000),
  };
}

/**
 * Brings older layouts to the current one. Version 1 is the first version,
 * so there is nothing to migrate yet. Add steps here: if (version < 2) { ... }
 */
export function migrate(raw: Obj): Obj {
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new DataError('Die Datei hat keine gültige Versionsnummer.');
  }
  if (version > SCHEMA_VERSION) {
    throw new DataError(
      'Die Datei stammt aus einer neueren Version der App. Bitte die App zuerst aktualisieren.',
    );
  }
  return raw;
}

/** Validates and normalises a complete data object. Throws DataError on problems. */
export function toAppData(input: unknown): AppData {
  if (!isObj(input)) throw new DataError('Die Daten haben ein unbekanntes Format.');
  const raw = migrate(input);
  if (!Array.isArray(raw.kids) || !Array.isArray(raw.incidents)) {
    throw new DataError('Kinder oder Einträge fehlen.');
  }
  const kids = raw.kids.map(kid);
  const kidIds = new Set(kids.map((k) => k.id));
  if (kidIds.size !== kids.length) throw new DataError('Kind-IDs sind doppelt vergeben.');
  const incidents = raw.incidents.map((i) => incident(i, kidIds));

  const decisions: Record<string, Decision> = {};
  if (raw.decisions !== undefined) {
    if (!isObj(raw.decisions)) throw new DataError('Entscheidungen sind ungültig.');
    for (const [id, d] of Object.entries(raw.decisions)) {
      if (kidIds.has(id)) decisions[id] = decision(d);
    }
  }

  const meta = isObj(raw.meta) ? raw.meta : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: settings(raw.settings),
    kids,
    incidents,
    decisions,
    meta: {
      lastBackup: typeof meta.lastBackup === 'string' ? meta.lastBackup : null,
      installHintDismissed: meta.installHintDismissed === true,
    },
  };
}
