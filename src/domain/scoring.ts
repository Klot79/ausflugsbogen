import { NEGATIVE_CRITERIA } from './criteria';
import { isInPeriod } from './dates';
import {
  NEGATIVE_CODES,
  POSITIVE_CODES,
  SAFETY_CODES,
  type Ampel,
  type CriterionCode,
  type Incident,
  type NegativeCode,
  type Settings,
} from './types';

export interface CriterionScore {
  code: NegativeCode;
  weight: number;
  count: number;
  stufe: number;
  points: number;
}

export interface KidScore {
  /** Anzahl je Kriterium (A1 bis D3, P1, P2) im Zeitraum */
  counts: Record<CriterionCode, number>;
  /** Alle 12 negativen Kriterien in fester Reihenfolge */
  criteria: CriterionScore[];
  raw: number;
  positives: number;
  bonus: number;
  net: number;
  ampel: Ampel;
  safetyCount: number;
  safetyCheck: boolean;
  /** Einträge im Beobachtungszeitraum */
  entriesInPeriod: number;
}

/** Stufe = (n >= s1) + (n >= s2) + (n >= s3) */
export function stufeFor(count: number, stufe: readonly [number, number, number]): number {
  return stufe.reduce((sum, s) => sum + (count >= s ? 1 : 0), 0);
}

export function ampelFor(net: number, thresholds: readonly [number, number, number]): Ampel {
  const [gelb, orange, rot] = thresholds;
  if (net >= rot) return 'rot';
  if (net >= orange) return 'orange';
  if (net >= gelb) return 'gelb';
  return 'gruen';
}

/** Highest possible raw score: sum of weights * 3 (default 69). */
export function maxPoints(weights: Record<NegativeCode, number>): number {
  return NEGATIVE_CODES.reduce((sum, code) => sum + (weights[code] ?? 0), 0) * 3;
}

function emptyCounts(): Record<CriterionCode, number> {
  const counts = {} as Record<CriterionCode, number>;
  for (const code of [...NEGATIVE_CODES, ...POSITIVE_CODES]) counts[code] = 0;
  return counts;
}

/**
 * Scores one child. `incidents` may contain entries of other children and entries
 * outside the observation period; both are ignored.
 */
export function scoreKid(kidId: string, incidents: readonly Incident[], s: Settings): KidScore {
  const counts = emptyCounts();
  let entriesInPeriod = 0;
  for (const inc of incidents) {
    if (inc.kidId !== kidId) continue;
    if (!isInPeriod(inc.date, s.from, s.to)) continue;
    counts[inc.code] += 1;
    entriesInPeriod += 1;
  }

  const criteria: CriterionScore[] = NEGATIVE_CRITERIA.map(({ code }) => {
    const count = counts[code];
    const weight = s.weights[code];
    const stufe = stufeFor(count, s.stufe);
    return { code, weight, count, stufe, points: stufe * weight };
  });

  const raw = criteria.reduce((sum, c) => sum + c.points, 0);
  const positives = counts.P1 + counts.P2;
  const bonus = Math.min(positives, Math.max(0, s.bonusCap));
  const net = Math.max(0, raw - bonus);
  const safetyCount = SAFETY_CODES.reduce((sum, code) => sum + counts[code], 0);
  const safetyCheck = s.safety > 0 && safetyCount >= s.safety;

  return {
    counts,
    criteria,
    raw,
    positives,
    bonus,
    net,
    ampel: ampelFor(net, s.ampel),
    safetyCount,
    safetyCheck,
    entriesInPeriod,
  };
}

export const AMPEL_LABELS: Record<Ampel, string> = {
  gruen: 'Grün',
  gelb: 'Gelb',
  orange: 'Orange',
  rot: 'Rot',
};

export const AMPEL_ORDER: Ampel[] = ['gruen', 'gelb', 'orange', 'rot'];

/** Recommendation: text for the traffic light colour plus the safety sentence if needed. */
export function recommendation(
  score: Pick<KidScore, 'ampel' | 'safetyCheck'>,
  s: Settings,
): string {
  const base = s.texts[score.ampel];
  return score.safetyCheck ? `${base} ${s.texts.safety}` : base;
}
