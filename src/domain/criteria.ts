import type { CriterionCode, NegativeCode, PositiveCode } from './types';

export interface Area {
  key: 'A' | 'B' | 'C' | 'D' | 'P';
  name: string;
}

export const AREAS: Area[] = [
  { key: 'A', name: 'Sicherheit' },
  { key: 'B', name: 'Regeln und Anweisungen' },
  { key: 'C', name: 'Sozialverhalten' },
  { key: 'D', name: 'Organisation' },
  { key: 'P', name: 'Positiv' },
];

export interface Criterion {
  code: CriterionCode;
  area: Area['key'];
  name: string;
  description: string;
  positive: boolean;
}

export interface NegativeCriterion extends Criterion {
  code: NegativeCode;
  defaultWeight: number;
  positive: false;
}

export interface PositiveCriterion extends Criterion {
  code: PositiveCode;
  positive: true;
}

export const NEGATIVE_CRITERIA: NegativeCriterion[] = [
  {
    code: 'A1',
    area: 'A',
    name: 'Körperliche Gewalt',
    defaultWeight: 3,
    positive: false,
    description:
      'Schlägt, tritt, stößt, beißt oder wirft Gegenstände gezielt auf Personen. Zählt nicht: versehentlicher Körperkontakt im Spiel.',
  },
  {
    code: 'A2',
    area: 'A',
    name: 'Gefährdendes Verhalten',
    defaultWeight: 3,
    positive: false,
    description:
      'Rennt auf Straße oder Parkplatz, klettert auf Geländer oder Mauern, hantiert mit gefährlichen Gegenständen, nachdem das Verbot ausgesprochen wurde.',
  },
  {
    code: 'A3',
    area: 'A',
    name: 'Entfernt sich von der Gruppe',
    defaultWeight: 3,
    positive: false,
    description:
      'Verlässt Gruppe, Klasse oder Gelände ohne Erlaubnis oder ist am Treffpunkt nicht auffindbar.',
  },
  {
    code: 'B1',
    area: 'B',
    name: 'Anweisung nicht befolgt',
    defaultWeight: 2,
    positive: false,
    description:
      'Befolgt eine klare Anweisung auch nach der zweiten Aufforderung nicht (eine Wiederholung ist erfolgt).',
  },
  {
    code: 'B2',
    area: 'B',
    name: 'Verweigerung / Respektlosigkeit gegenüber Erwachsenen',
    defaultWeight: 2,
    positive: false,
    description:
      'Verweigert ausdrücklich die Zusammenarbeit oder beschimpft oder verspottet Lehrkraft oder Begleitperson.',
  },
  {
    code: 'B3',
    area: 'B',
    name: 'Regelverstoß in Gruppensituationen',
    defaultWeight: 2,
    positive: false,
    description:
      'Hält sich beim Gehen in Reihe, auf Treppen, im Bus oder Zug, beim Aufstellen oder Warten nicht an die Regeln (ausscheren, vordrängeln, schubsen).',
  },
  {
    code: 'C1',
    area: 'C',
    name: 'Verbale oder soziale Verletzung',
    defaultWeight: 2,
    positive: false,
    description:
      'Beleidigt, verspottet, bedroht oder schließt Mitschüler gezielt aus. Beobachtet von Lehrkraft oder zwei Zeugen.',
  },
  {
    code: 'C2',
    area: 'C',
    name: 'Fremdes Eigentum',
    defaultWeight: 2,
    positive: false,
    description: 'Beschädigt oder nimmt fremdes Eigentum (auch Schuleigentum) ohne Erlaubnis.',
  },
  {
    code: 'C3',
    area: 'C',
    name: 'Unterrichts- oder Gruppenstörung',
    defaultWeight: 1,
    positive: false,
    description:
      'Ruft dazwischen, steht auf oder lenkt andere ab, obwohl die Regel schon einmal erinnert wurde.',
  },
  {
    code: 'D1',
    area: 'D',
    name: 'Vereinbarungen oder Material nicht eingehalten',
    defaultWeight: 1,
    positive: false,
    description:
      'Vereinbartes Material oder Aufgaben wiederholt nicht dabei. Zählt nicht, wenn die Verantwortung bei Eltern oder Organisation liegt.',
  },
  {
    code: 'D2',
    area: 'D',
    name: 'Unpünktlichkeit',
    defaultWeight: 1,
    positive: false,
    description:
      'Kommt ohne triftigen Grund mehr als 5 Minuten zu spät. Zählt nicht bei Verspätung durch Transport oder Eltern.',
  },
  {
    code: 'D3',
    area: 'D',
    name: 'Arbeitsverweigerung',
    defaultWeight: 1,
    positive: false,
    description: 'Bricht eine Aufgabe ab oder verweigert die Arbeit, obwohl Hilfe angeboten wurde.',
  },
];

export const POSITIVE_CRITERIA: PositiveCriterion[] = [
  {
    code: 'P1',
    area: 'P',
    name: 'Vorfallfreie Woche',
    positive: true,
    description:
      'Eine ganze Unterrichtswoche ohne Eintrag in A1 bis D3. Jeder Eintrag zählt 1 Bonuspunkt.',
  },
  {
    code: 'P2',
    area: 'P',
    name: 'Wiedergutmachung / Verantwortung',
    positive: true,
    description:
      'Entschuldigt sich aufrichtig, repariert Schaden, hilft anderen oder hält eine Vereinbarung ein. Jeder Eintrag zählt 1 Bonuspunkt.',
  },
];

export const ALL_CRITERIA: Criterion[] = [...NEGATIVE_CRITERIA, ...POSITIVE_CRITERIA];

const BY_CODE = new Map<string, Criterion>(ALL_CRITERIA.map((c) => [c.code, c]));

export function getCriterion(code: CriterionCode): Criterion {
  const c = BY_CODE.get(code);
  if (!c) throw new Error(`Unbekanntes Kriterium: ${code}`);
  return c;
}

export function isCriterionCode(value: unknown): value is CriterionCode {
  return typeof value === 'string' && BY_CODE.has(value);
}

export function areaName(key: Area['key']): string {
  return AREAS.find((a) => a.key === key)?.name ?? key;
}
