/** Version of the stored data layout. Increase it and add a migration when the layout changes. */
export const SCHEMA_VERSION = 1;

export const NEGATIVE_CODES = [
  'A1',
  'A2',
  'A3',
  'B1',
  'B2',
  'B3',
  'C1',
  'C2',
  'C3',
  'D1',
  'D2',
  'D3',
] as const;
export const POSITIVE_CODES = ['P1', 'P2'] as const;
export const SAFETY_CODES = ['A1', 'A2', 'A3'] as const;

export type NegativeCode = (typeof NEGATIVE_CODES)[number];
export type PositiveCode = (typeof POSITIVE_CODES)[number];
export type CriterionCode = NegativeCode | PositiveCode;

/** Local calendar date as "YYYY-MM-DD". Empty string means "not set". */
export type DateString = string;

export type Ampel = 'gruen' | 'gelb' | 'orange' | 'rot';

export interface RecommendationTexts {
  gruen: string;
  gelb: string;
  orange: string;
  rot: string;
  safety: string;
}

export interface Settings {
  /** Ziel des Ausflugs */
  trip: string;
  tripDate: DateString;
  /** Beobachtungszeitraum von (inklusive). Leer = ohne Untergrenze. */
  from: DateString;
  /** Beobachtungszeitraum bis (inklusive). Leer = offen. */
  to: DateString;
  /** Kürzel der beobachtenden Person (Vorgabe für neue Einträge) */
  by: string;
  /** Stufengrenzen s1, s2, s3 */
  stufe: [number, number, number];
  /** Ampel-Schwellen gelb, orange, rot (aufsteigend) */
  ampel: [number, number, number];
  /** Sicherheitsschwelle: Summe A1 bis A3. 0 schaltet die Prüfung ab. */
  safety: number;
  bonusCap: number;
  weights: Record<NegativeCode, number>;
  texts: RecommendationTexts;
}

export interface Kid {
  id: string;
  name: string;
  /** Beispielkind aus den Demodaten */
  demo: boolean;
}

export interface Incident {
  id: string;
  kidId: string;
  code: CriterionCode;
  date: DateString;
  /** max. 300 Zeichen */
  note: string;
  /** max. 20 Zeichen */
  by: string;
  /** Zeitpunkt der Erfassung (ISO-Zeitstempel, nur zur Sortierung) */
  createdAt: string;
}

export const DECISION_VALUES = ['offen', 'ohne', 'vereinbarung', 'auflagen', 'ausschluss'] as const;
export type DecisionValue = (typeof DECISION_VALUES)[number];

export const DECISION_LABELS: Record<DecisionValue, string> = {
  offen: 'offen',
  ohne: 'Teilnahme ohne Auflagen',
  vereinbarung: 'Teilnahme mit Vereinbarung',
  auflagen: 'Teilnahme mit Auflagen',
  ausschluss: 'Ausschluss vom Ausflug',
};

export interface Decision {
  talkDate: DateString;
  conditions: string;
  decision: DecisionValue;
  reason: string;
  /** Betreuung am Ausflugstag */
  care: string;
}

export interface Meta {
  /** Zeitpunkt des letzten Backups (ISO) */
  lastBackup: string | null;
  /** Hinweis "Zum Home-Bildschirm" ausgeblendet */
  installHintDismissed: boolean;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  kids: Kid[];
  incidents: Incident[];
  decisions: Record<string, Decision>;
  meta: Meta;
}

export const NOTE_MAX = 300;
export const BY_MAX = 20;
export const NAME_MAX = 40;
