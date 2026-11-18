import { describe, expect, it } from 'vitest';
import { initialAppData } from '../domain/demo';
import { SCHEMA_VERSION } from '../domain/types';
import { createBackup, parseBackup } from './backup';
import { classCsv, csvCell } from './csv';
import { DataError } from './validate';

const NOW = new Date(2026, 10, 18, 10, 0);

function sample() {
  const data = initialAppData(NOW);
  const kidId = data.kids[0]!.id;
  data.decisions[kidId] = {
    talkDate: '2026-11-20',
    conditions: 'Feste Begleitperson',
    decision: 'auflagen',
    reason: 'Zwei Vorfälle A1 im Zeitraum.',
    care: '',
  };
  data.settings.trip = 'Zoo';
  data.meta.lastBackup = '2026-11-01T10:00:00.000Z';
  return data;
}

describe('Backup', () => {
  it('Round-Trip ergibt dieselben Daten', () => {
    const data = sample();
    const parsed = parseBackup(createBackup(data, NOW));
    expect(parsed.data).toEqual(data);
    expect(parsed.kids).toBe(3);
    expect(parsed.incidents).toBe(data.incidents.length);
  });

  it('lehnt ungültiges JSON ab', () => {
    expect(() => parseBackup('{kein json')).toThrow(DataError);
  });

  it('lehnt fremde JSON-Dateien ab', () => {
    expect(() => parseBackup('{"name":"irgendwas","items":[]}')).toThrow(/kein Backup/);
    expect(() => parseBackup('[1,2,3]')).toThrow(/kein Backup/);
    expect(() => parseBackup('null')).toThrow(/kein Backup/);
  });

  it('lehnt neuere Versionen ab', () => {
    const file = JSON.parse(createBackup(sample(), NOW));
    file.data.schemaVersion = SCHEMA_VERSION + 1;
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/neueren Version/);
  });

  it('lehnt Einträge mit unbekanntem Kriterium oder Kind ab', () => {
    const file = JSON.parse(createBackup(sample(), NOW));
    file.data.incidents[0].code = 'Z9';
    expect(() => parseBackup(JSON.stringify(file))).toThrow(/Kriterium/);
    const file2 = JSON.parse(createBackup(sample(), NOW));
    file2.data.incidents[0].kidId = 'gibt-es-nicht';
    expect(() => parseBackup(JSON.stringify(file2))).toThrow(/Kind/);
  });

  it('entfernt unbekannte Felder und kürzt zu lange Notizen', () => {
    const file = JSON.parse(createBackup(sample(), NOW));
    file.data.kids[0].evil = '<script>';
    file.data.incidents[0].note = 'x'.repeat(500);
    const { data } = parseBackup(JSON.stringify(file));
    expect(Object.keys(data.kids[0]!)).toEqual(['id', 'name', 'demo']);
    expect(data.incidents[0]!.note).toHaveLength(300);
  });
});

describe('CSV', () => {
  it('hat Kopfzeile und eine Zeile pro Kind', () => {
    const csv = classCsv(sample());
    const lines = csv.replace(String.fromCharCode(0xfeff), '').trim().split('\r\n');
    expect(lines[0]).toContain('Name;Beispiel;Ampel');
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe('Beispielkind A;ja;Gelb;13;0;13;10;nein;Teilnahme mit Auflagen');
    expect(lines[2]).toContain('Orange;26;0;26;16;ja');
  });

  it('maskiert Trennzeichen, Anführungszeichen und Formeln', () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('sagt "hallo"')).toBe('"sagt ""hallo"""');
    expect(csvCell('=SUMME(A1)')).toBe("'=SUMME(A1)");
  });
});
