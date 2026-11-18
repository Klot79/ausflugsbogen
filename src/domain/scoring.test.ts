import { describe, expect, it } from 'vitest';
import { defaultSettings } from './defaults';
import { ampelFor, maxPoints, recommendation, scoreKid, stufeFor } from './scoring';
import type { CriterionCode, Incident, Settings } from './types';

const NOW = new Date(2026, 10, 18, 9, 0);

function settings(patch: Partial<Settings> = {}): Settings {
  return { ...defaultSettings(NOW), from: '', to: '', ...patch };
}

let seq = 0;
function entries(kidId: string, spec: [CriterionCode, number][], date = '2026-11-10'): Incident[] {
  const out: Incident[] = [];
  for (const [code, n] of spec) {
    for (let i = 0; i < n; i++) {
      seq += 1;
      out.push({ id: `i${seq}`, kidId, code, date, note: '', by: '', createdAt: '' });
    }
  }
  return out;
}

const KID_A: [CriterionCode, number][] = [
  ['A1', 2],
  ['B1', 3],
  ['B3', 3],
  ['C1', 2],
];
const KID_B: [CriterionCode, number][] = [
  ['A1', 3],
  ['A2', 1],
  ['A3', 1],
  ['B1', 5],
  ['B2', 3],
  ['C1', 3],
];

describe('Pflicht-Testfälle', () => {
  it('Kind A: Roh 13, Netto 13, Gelb, keine Sicherheitsprüfung', () => {
    const r = scoreKid('a', entries('a', KID_A), settings());
    expect(r.raw).toBe(13);
    expect(r.bonus).toBe(0);
    expect(r.net).toBe(13);
    expect(r.ampel).toBe('gelb');
    expect(r.safetyCheck).toBe(false);
  });

  it('Kind B: Roh 26, Netto 26, Orange, Sicherheitsprüfung (A-Summe 5)', () => {
    const r = scoreKid('b', entries('b', KID_B), settings());
    expect(r.raw).toBe(26);
    expect(r.net).toBe(26);
    expect(r.ampel).toBe('orange');
    expect(r.safetyCount).toBe(5);
    expect(r.safetyCheck).toBe(true);
  });

  it('Kind C: Roh 0, Bonus 2, Netto 0, Grün', () => {
    const r = scoreKid(
      'c',
      entries('c', [
        ['P1', 1],
        ['P2', 1],
      ]),
      settings(),
    );
    expect(r.raw).toBe(0);
    expect(r.bonus).toBe(2);
    expect(r.net).toBe(0);
    expect(r.ampel).toBe('gruen');
  });

  it('Kind B plus 10 positive Einträge: Bonus 8 (Obergrenze), Netto 18', () => {
    const list = [
      ...entries('b', KID_B),
      ...entries('b', [
        ['P1', 4],
        ['P2', 6],
      ]),
    ];
    const r = scoreKid('b', list, settings());
    expect(r.positives).toBe(10);
    expect(r.bonus).toBe(8);
    expect(r.net).toBe(18);
    expect(r.ampel).toBe('gelb');
  });

  it('Stufengrenzen: 0 -> 0, 1-2 -> 1, 3-4 -> 2, ab 5 -> 3', () => {
    const s = settings().stufe;
    expect(stufeFor(0, s)).toBe(0);
    expect(stufeFor(1, s)).toBe(1);
    expect(stufeFor(2, s)).toBe(1);
    expect(stufeFor(3, s)).toBe(2);
    expect(stufeFor(4, s)).toBe(2);
    expect(stufeFor(5, s)).toBe(3);
    expect(stufeFor(12, s)).toBe(3);
  });

  it('Netto wird nie negativ', () => {
    const r = scoreKid('c', entries('c', [['P2', 5]]), settings());
    expect(r.raw).toBe(0);
    expect(r.bonus).toBe(5);
    expect(r.net).toBe(0);
  });

  it('Maximalpunkte bei Standardgewichten sind 69', () => {
    expect(maxPoints(settings().weights)).toBe(69);
  });
});

describe('Beobachtungszeitraum', () => {
  const list = [
    ...entries('k', [['B1', 1]], '2026-10-31'), // vor dem Zeitraum
    ...entries('k', [['B1', 1]], '2026-11-01'), // erster Tag
    ...entries('k', [['B1', 1]], '2026-11-15'), // mittendrin
    ...entries('k', [['B1', 1]], '2026-11-30'), // letzter Tag
    ...entries('k', [['B1', 1]], '2026-12-01'), // danach
  ];

  it('Einträge außerhalb zählen nicht, Grenzdaten zählen mit', () => {
    const r = scoreKid('k', list, settings({ from: '2026-11-01', to: '2026-11-30' }));
    expect(r.counts.B1).toBe(3);
    expect(r.entriesInPeriod).toBe(3);
  });

  it('Leeres "bis" ist offen', () => {
    const r = scoreKid('k', list, settings({ from: '2026-11-01', to: '' }));
    expect(r.counts.B1).toBe(4);
  });

  it('Leeres "von" hat keine Untergrenze', () => {
    const r = scoreKid('k', list, settings({ from: '', to: '2026-11-30' }));
    expect(r.counts.B1).toBe(4);
  });

  it('Einträge anderer Kinder zählen nicht', () => {
    const r = scoreKid('x', list, settings());
    expect(r.entriesInPeriod).toBe(0);
  });
});

describe('Ampel und Empfehlung', () => {
  it('Schwellen inklusive', () => {
    const t: [number, number, number] = [10, 20, 30];
    expect(ampelFor(9, t)).toBe('gruen');
    expect(ampelFor(10, t)).toBe('gelb');
    expect(ampelFor(19, t)).toBe('gelb');
    expect(ampelFor(20, t)).toBe('orange');
    expect(ampelFor(30, t)).toBe('rot');
  });

  it('Sicherheitsschwelle 0 schaltet die Prüfung ab', () => {
    const r = scoreKid('b', entries('b', KID_B), settings({ safety: 0 }));
    expect(r.safetyCheck).toBe(false);
  });

  it('Sicherheitsprüfung gilt unabhängig von der Ampel', () => {
    const r = scoreKid('s', entries('s', [['A3', 3]]), settings());
    expect(r.ampel).toBe('gruen');
    expect(r.safetyCheck).toBe(true);
  });

  it('Empfehlung hängt den Sicherheitssatz an', () => {
    const s = settings();
    expect(recommendation({ ampel: 'gelb', safetyCheck: false }, s)).toBe(s.texts.gelb);
    expect(recommendation({ ampel: 'gelb', safetyCheck: true }, s)).toBe(
      `${s.texts.gelb} ${s.texts.safety}`,
    );
  });

  it('Geänderte Gewichte wirken auf Punkte und Maximum', () => {
    const s = settings();
    s.weights = { ...s.weights, A1: 5 };
    const r = scoreKid('a', entries('a', [['A1', 1]]), s);
    expect(r.raw).toBe(5);
    expect(maxPoints(s.weights)).toBe(75);
  });
});
