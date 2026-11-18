import { useEffect, useRef, useState } from 'preact/hooks';
import { NEGATIVE_CRITERIA } from '../../domain/criteria';
import { formatDate, today } from '../../domain/dates';
import { hasDemo } from '../../domain/demo';
import { resetRules } from '../../domain/defaults';
import { maxPoints } from '../../domain/scoring';
import { validateSettings } from '../../domain/settingsValidation';
import type { NegativeCode, RecommendationTexts, Settings } from '../../domain/types';
import { FONT_STATUS_TEXT, type FontStatus } from '../../platform/fonts';
import { replaceSettings, updateSettings } from '../../state/store';
import { confirmDialog, showToast } from '../../state/ui';
import {
  deleteAllWithConfirm,
  downloadBackup,
  downloadCsv,
  importBackupFile,
  removeDemoWithConfirm,
} from '../actions';
import { Section, useData } from '../components/common';

/** Integer input that keeps what the user types and commits on blur. */
function IntField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
  hint?: string;
}) {
  const [text, setText] = useState(String(props.value));
  useEffect(() => setText(String(props.value)), [props.value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() !== '' && Number.isInteger(n) && n >= props.min && n <= props.max) {
      if (n !== props.value) props.onCommit(n);
    } else {
      setText(String(props.value));
      showToast(
        `${props.label}: bitte eine ganze Zahl von ${props.min} bis ${props.max}.`,
        undefined,
        true,
      );
    }
  };
  return (
    <label>
      {props.label}
      <input
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        step={1}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
      />
      {props.hint && <span class="hint">{props.hint}</span>}
    </label>
  );
}

function TextSetting(props: {
  label: string;
  value: string;
  maxLength: number;
  onCommit: (v: string) => void;
  type?: 'text' | 'date';
}) {
  const [text, setText] = useState(props.value);
  useEffect(() => setText(props.value), [props.value]);
  return (
    <label>
      {props.label}
      <input
        type={props.type ?? 'text'}
        value={text}
        maxLength={props.maxLength}
        onInput={(e) => setText(e.currentTarget.value)}
        onBlur={() => text !== props.value && props.onCommit(text.trim())}
      />
    </label>
  );
}

const TEXT_LABELS: [keyof RecommendationTexts, string][] = [
  ['gruen', 'Text bei Grün'],
  ['gelb', 'Text bei Gelb'],
  ['orange', 'Text bei Orange'],
  ['rot', 'Text bei Rot'],
  ['safety', 'Zusatzsatz bei Sicherheitsprüfung'],
];

export function SettingsScreen({ fontStatus }: { fontStatus: FontStatus }) {
  const d = useData();
  const s = d.settings;
  const warnings = validateSettings(s);
  const fileRef = useRef<HTMLInputElement>(null);

  const setTriple = (key: 'stufe' | 'ampel', index: number, v: number) => {
    const next = [...s[key]] as [number, number, number];
    next[index] = v;
    updateSettings({ [key]: next } as Partial<Settings>);
  };
  const setWeight = (code: NegativeCode, v: number) =>
    updateSettings({ weights: { ...s.weights, [code]: v } });
  const setText = (key: keyof RecommendationTexts, v: string) =>
    updateSettings({ texts: { ...s.texts, [key]: v } });

  const reset = async () => {
    const ok = await confirmDialog({
      title: 'Regeln zurücksetzen?',
      message:
        'Stufen, Ampel-Schwellen, Sicherheitsschwelle, Bonus-Obergrenze, Gewichte und Empfehlungstexte werden auf den Standard gesetzt. Ausflug, Zeitraum und alle Einträge bleiben.',
      confirmLabel: 'Zurücksetzen',
    });
    if (ok) {
      replaceSettings(resetRules(s));
      showToast('Regeln auf Standard zurückgesetzt.');
    }
  };

  return (
    <div class="screen">
      {warnings.length > 0 && (
        <div class="banner warn alert" role="alert">
          <strong>Bitte Einstellungen prüfen:</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Ausflug">
        <div class="grid-2">
          <TextSetting
            label="Ziel"
            value={s.trip}
            maxLength={120}
            onCommit={(v) => updateSettings({ trip: v })}
          />
          <TextSetting
            label="Datum"
            type="date"
            value={s.tripDate}
            maxLength={10}
            onCommit={(v) => updateSettings({ tripDate: v })}
          />
        </div>
      </Section>

      <Section title="Beobachtungszeitraum">
        <div class="grid-2">
          <TextSetting
            label="Von (inklusive)"
            type="date"
            value={s.from}
            maxLength={10}
            onCommit={(v) => updateSettings({ from: v })}
          />
          <TextSetting
            label="Bis (inklusive)"
            type="date"
            value={s.to}
            maxLength={10}
            onCommit={(v) => updateSettings({ to: v })}
          />
        </div>
        <p class="hint">Leeres "Bis" bedeutet offen. Leeres "Von" bedeutet ohne Untergrenze.</p>
      </Section>

      <Section title="Regeln">
        <h3>Stufen (Anzahl Einträge je Kriterium)</h3>
        <div class="grid-3">
          {[0, 1, 2].map((i) => (
            <IntField
              key={i}
              label={`Stufe ${i + 1} ab`}
              value={s.stufe[i]!}
              min={1}
              max={99}
              onCommit={(v) => setTriple('stufe', i, v)}
            />
          ))}
        </div>
        <h3>Ampel-Schwellen (Nettopunkte)</h3>
        <div class="grid-3">
          {(['Gelb ab', 'Orange ab', 'Rot ab'] as const).map((label, i) => (
            <IntField
              key={label}
              label={label}
              value={s.ampel[i]!}
              min={0}
              max={999}
              onCommit={(v) => setTriple('ampel', i, v)}
            />
          ))}
        </div>
        <div class="grid-2">
          <IntField
            label="Sicherheitsschwelle (A1 bis A3)"
            value={s.safety}
            min={0}
            max={99}
            hint="0 schaltet die Sicherheitsprüfung ab."
            onCommit={(v) => updateSettings({ safety: v })}
          />
          <IntField
            label="Bonus-Obergrenze"
            value={s.bonusCap}
            min={0}
            max={99}
            onCommit={(v) => updateSettings({ bonusCap: v })}
          />
        </div>
        <p class="info-line">
          Maximal mögliche Punkte: <strong>{maxPoints(s.weights)}</strong> (Summe der Gewichte mal
          3)
        </p>
      </Section>

      <Section title="Gewichte (1 bis 5)">
        <div class="weights">
          {NEGATIVE_CRITERIA.map((c) => (
            <IntField
              key={c.code}
              label={`${c.code} ${c.name}`}
              value={s.weights[c.code]}
              min={1}
              max={5}
              onCommit={(v) => setWeight(c.code, v)}
            />
          ))}
        </div>
      </Section>

      <Section title="Empfehlungstexte">
        {TEXT_LABELS.map(([key, label]) => (
          <TextArea
            key={key}
            label={label}
            value={s.texts[key]}
            onCommit={(v) => setText(key, v)}
          />
        ))}
        <div class="row">
          <button type="button" class="btn" onClick={reset}>
            Regeln auf Standard zurücksetzen
          </button>
        </div>
      </Section>

      <Section title="Daten und Backup">
        <p class="hint">
          Letztes Backup:{' '}
          {d.meta.lastBackup ? formatDate(today(new Date(d.meta.lastBackup))) : 'noch keines'}
        </p>
        <div class="row wrap">
          <button type="button" class="btn primary" onClick={downloadBackup}>
            Backup herunterladen
          </button>
          <button type="button" class="btn" onClick={() => fileRef.current?.click()}>
            Backup einspielen
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (file) void importBackupFile(file);
            }}
          />
          <button type="button" class="btn" onClick={downloadCsv}>
            Klassenübersicht als CSV
          </button>
        </div>
        <div class="row wrap">
          {hasDemo(d) && (
            <button type="button" class="btn" onClick={removeDemoWithConfirm}>
              Beispieldaten entfernen
            </button>
          )}
          <button type="button" class="btn danger" onClick={deleteAllWithConfirm}>
            Alle Daten löschen
          </button>
        </div>
      </Section>

      <Section title="Datenschutz">
        <ul class="plain">
          <li>
            Alle Daten bleiben ausschließlich auf diesem Gerät. Nichts wird an einen Server
            gesendet.
          </li>
          <li>Nur Vornamen oder Kürzel verwenden.</li>
          <li>Backups enthalten Daten von Kindern: sicher aufbewahren und nicht weitergeben.</li>
          <li>Nach dem Schuljahr alle Daten und Backups löschen.</li>
          <li>
            Safari kann Webseiten-Daten nach etwa 7 Tagen ohne Nutzung löschen. Darum die App zum
            Home-Bildschirm hinzufügen und regelmäßig ein Backup machen.
          </li>
        </ul>
      </Section>

      <Section title="Schrift">
        <p class={fontStatus === 'ok' ? 'hint' : 'warn-text'}>{FONT_STATUS_TEXT[fontStatus]}</p>
      </Section>
    </div>
  );
}

function TextArea(props: { label: string; value: string; onCommit: (v: string) => void }) {
  const [text, setText] = useState(props.value);
  useEffect(() => setText(props.value), [props.value]);
  return (
    <label class="block">
      {props.label}
      <textarea
        rows={2}
        maxLength={1000}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        onBlur={() => text.trim() !== props.value && props.onCommit(text.trim())}
      />
    </label>
  );
}
