import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatDate, isInPeriod, isValidDateString, today } from './dates';
import { defaultSettings } from './defaults';
import { createDemo, hasDemo, initialAppData, removeDemo } from './demo';
import { parseKidNames } from './kids';
import { scoreKid } from './scoring';
import { validateSettings } from './settingsValidation';

const NOW = new Date(2026, 10, 18, 23, 30); // spät abends: UTC wäre schon der nächste Tag in manchen Zonen

describe('Datum', () => {
  it('heute als lokales Datum', () => {
    expect(today(NOW)).toBe('2026-11-18');
  });
  it('addDays über Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // Zeitumstellung
  });
  it('prüft Datumsstrings', () => {
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('18.11.2026')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });
  it('formatiert deutsch', () => {
    expect(formatDate('2026-11-08')).toBe('08.11.2026');
  });
  it('Zeitraum inklusive Grenzen', () => {
    expect(isInPeriod('2026-11-01', '2026-11-01', '2026-11-30')).toBe(true);
    expect(isInPeriod('2026-11-30', '2026-11-01', '2026-11-30')).toBe(true);
    expect(isInPeriod('2026-12-01', '2026-11-01', '')).toBe(true);
    expect(isInPeriod('2020-01-01', '', '')).toBe(true);
  });
  it('Tage zwischen zwei Daten', () => {
    expect(daysBetween('2026-11-01', '2026-11-15')).toBe(14);
  });
});

describe('Beispieldaten', () => {
  it('ergeben genau die Testfälle', () => {
    const data = initialAppData(NOW);
    const s = data.settings;
    const [a, b, c] = data.kids;
    const ra = scoreKid(a!.id, data.incidents, s);
    const rb = scoreKid(b!.id, data.incidents, s);
    const rc = scoreKid(c!.id, data.incidents, s);
    expect([ra.net, ra.ampel, ra.safetyCheck]).toEqual([13, 'gelb', false]);
    expect([rb.net, rb.ampel, rb.safetyCheck]).toEqual([26, 'orange', true]);
    expect([rc.raw, rc.bonus, rc.net, rc.ampel]).toEqual([0, 2, 0, 'gruen']);
  });
  it('alle Einträge liegen im Standard-Zeitraum und nicht in der Zukunft', () => {
    const s = defaultSettings(NOW);
    const { incidents } = createDemo(NOW);
    for (const i of incidents) {
      expect(isInPeriod(i.date, s.from, s.to)).toBe(true);
      expect(i.date <= today(NOW)).toBe(true);
    }
  });
  it('lassen sich vollständig entfernen', () => {
    const data = initialAppData(NOW);
    data.kids.push({ id: 'echt', name: 'Lea', demo: false });
    data.incidents.push({
      id: 'x',
      kidId: 'echt',
      code: 'C3',
      date: '2026-11-10',
      note: '',
      by: '',
      createdAt: '',
    });
    const cleaned = removeDemo(data);
    expect(hasDemo(cleaned)).toBe(false);
    expect(cleaned.kids.map((k) => k.name)).toEqual(['Lea']);
    expect(cleaned.incidents).toHaveLength(1);
  });
});

describe('Namen einlesen', () => {
  it('trennt nach Zeile und Komma, entfernt Leeres und Doppeltes', () => {
    expect(parseKidNames('Lea, Tom\nMia\n\n  lea  ,Ben ')).toEqual(['Lea', 'Tom', 'Mia', 'Ben']);
  });
  it('ignoriert vorhandene Namen', () => {
    expect(parseKidNames('Tom, Ana', [{ id: '1', name: 'tom', demo: false }])).toEqual(['Ana']);
  });
});

describe('Einstellungen prüfen', () => {
  it('Standard ist gültig', () => {
    expect(validateSettings(defaultSettings(NOW))).toEqual([]);
  });
  it('meldet nicht aufsteigende Schwellen und falsches Datum', () => {
    const s = defaultSettings(NOW);
    s.stufe = [1, 5, 3];
    s.ampel = [10, 10, 30];
    s.from = '2026-11-20';
    s.to = '2026-11-01';
    s.weights = { ...s.weights, B2: 9 };
    const w = validateSettings(s);
    expect(w).toHaveLength(4);
    expect(w.join(' ')).toContain('Stufengrenzen');
    expect(w.join(' ')).toContain('Ampel');
    expect(w.join(' ')).toContain('Enddatum');
    expect(w.join(' ')).toContain('B2');
  });
});
