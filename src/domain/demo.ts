import { addDays, today } from './dates';
import { emptyAppData } from './defaults';
import { newId } from './ids';
import type { AppData, CriterionCode, Incident, Kid } from './types';

/**
 * Example children. Their entries produce exactly the documented test cases:
 *  A: Roh 13, Netto 13, Gelb
 *  B: Roh 26, Netto 26, Orange, Sicherheit prüfen
 *  C: Roh 0, Bonus 2, Netto 0, Grün
 */
export const DEMO_PLAN: { name: string; entries: [CriterionCode, number][] }[] = [
  {
    name: 'Beispielkind A',
    entries: [
      ['A1', 2],
      ['B1', 3],
      ['B3', 3],
      ['C1', 2],
    ],
  },
  {
    name: 'Beispielkind B',
    entries: [
      ['A1', 3],
      ['A2', 1],
      ['A3', 1],
      ['B1', 5],
      ['B2', 3],
      ['C1', 3],
    ],
  },
  {
    name: 'Beispielkind C',
    entries: [
      ['P1', 1],
      ['P2', 1],
    ],
  },
];

/** Builds demo kids and incidents. Dates lie within the last 30 days before `now`. */
export function createDemo(now: Date = new Date()): { kids: Kid[]; incidents: Incident[] } {
  const t = today(now);
  const kids: Kid[] = [];
  const incidents: Incident[] = [];
  let step = 0;
  for (const plan of DEMO_PLAN) {
    const kid: Kid = { id: newId(), name: plan.name, demo: true };
    kids.push(kid);
    for (const [code, count] of plan.entries) {
      for (let i = 0; i < count; i++) {
        step += 1;
        incidents.push({
          id: newId(),
          kidId: kid.id,
          code,
          date: addDays(t, -((step * 3) % 29) - 1),
          note: 'Beispieleintrag',
          by: 'Demo',
          createdAt: new Date(now.getTime() - step * 60_000).toISOString(),
        });
      }
    }
  }
  return { kids, incidents };
}

/** Data for the very first start: default settings plus the three demo children. */
export function initialAppData(now: Date = new Date()): AppData {
  const data = emptyAppData(now);
  const demo = createDemo(now);
  return { ...data, kids: demo.kids, incidents: demo.incidents };
}

export function hasDemo(data: Pick<AppData, 'kids'>): boolean {
  return data.kids.some((k) => k.demo);
}

/** Removes demo kids together with their entries and decisions. */
export function removeDemo(data: AppData): AppData {
  const demoIds = new Set(data.kids.filter((k) => k.demo).map((k) => k.id));
  const decisions = { ...data.decisions };
  for (const id of demoIds) delete decisions[id];
  return {
    ...data,
    kids: data.kids.filter((k) => !demoIds.has(k.id)),
    incidents: data.incidents.filter((i) => !demoIds.has(i.kidId)),
    decisions,
  };
}
