import { useMemo, useState } from 'preact/hooks';
import {
  AREAS,
  NEGATIVE_CRITERIA,
  POSITIVE_CRITERIA,
  getCriterion,
  type Criterion,
} from '../../domain/criteria';
import { formatDate, today } from '../../domain/dates';
import { sortKidsByName } from '../../domain/kids';
import { AMPEL_LABELS, scoreKid } from '../../domain/scoring';
import { BY_MAX, NOTE_MAX } from '../../domain/types';
import { useExternal } from '../../state/hooks';
import { addIncident, removeIncident, updateSettings } from '../../state/store';
import { routeHref, selectedKidSignal, showToast } from '../../state/ui';
import { deleteIncidentWithUndo } from '../actions';
import { AddKidsForm, AmpelDot, Section, SrOnly, useData } from '../components/common';

const RECENT_COUNT = 8;

export function Capture() {
  const d = useData();
  const selectedId = useExternal(selectedKidSignal.subscribe, selectedKidSignal.get);
  const [date, setDate] = useState(today());
  const [by, setBy] = useState(d.settings.by);
  const [note, setNote] = useState('');
  const [fullText, setFullText] = useState(false);
  const [showAdd, setShowAdd] = useState(d.kids.length === 0);

  const kids = useMemo(() => sortKidsByName(d.kids), [d.kids]);
  const selected = kids.find((k) => k.id === selectedId) ?? null;
  const kidName = (id: string) => d.kids.find((k) => k.id === id)?.name ?? '?';

  const recent = useMemo(
    () =>
      [...d.incidents]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT_COUNT),
    [d.incidents],
  );

  const record = (c: Criterion) => {
    if (!selected) return;
    const inc = addIncident({ kidId: selected.id, code: c.code, date: date || today(), note, by });
    setNote('');
    showToast(`${c.code} ${c.name} für ${selected.name} gespeichert.`, () =>
      removeIncident(inc.id),
    );
  };

  const criterionButton = (c: Criterion) => (
    <li key={c.code}>
      <button
        type="button"
        class={`crit ${c.positive ? 'crit-pos' : `crit-${c.area}`}`}
        disabled={!selected}
        onClick={() => record(c)}
      >
        <span class="crit-head">
          <span class="crit-code">{c.code}</span>
          <span class="crit-name">{c.name}</span>
        </span>
        <span class={`crit-desc ${fullText ? 'full' : ''}`}>{c.description}</span>
      </button>
    </li>
  );

  return (
    <div class="screen">
      <Section title="1. Kind wählen">
        {kids.length > 0 && (
          <ul class="chips" aria-label="Kinder">
            {kids.map((k) => {
              const r = scoreKid(k.id, d.incidents, d.settings);
              const active = k.id === selectedId;
              return (
                <li key={k.id}>
                  <button
                    type="button"
                    class={`chip ${active ? 'active' : ''}`}
                    aria-pressed={active}
                    onClick={() => selectedKidSignal.set(active ? null : k.id)}
                  >
                    <AmpelDot ampel={r.ampel} />
                    <span>{k.name}</span>
                    <SrOnly>
                      , Ampel {AMPEL_LABELS[r.ampel]}, {r.net} Punkte
                    </SrOnly>
                    {k.demo && <span class="demo-mark">Beispiel</span>}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                class="chip chip-add"
                aria-expanded={showAdd}
                onClick={() => setShowAdd(!showAdd)}
              >
                + Kind
              </button>
            </li>
          </ul>
        )}
        {(showAdd || kids.length === 0) && <AddKidsForm onDone={() => setShowAdd(false)} />}
      </Section>

      <Section title="2. Kriterium antippen">
        <p class="hint">
          {selected ? (
            <>
              Ein Tipp speichert sofort für <strong>{selected.name}</strong>.
            </>
          ) : (
            'Zuerst oben ein Kind wählen.'
          )}
        </p>
        <div class="grid-3">
          <label>
            Datum
            <input
              type="date"
              value={date}
              max={today()}
              onInput={(e) => setDate(e.currentTarget.value)}
            />
          </label>
          <label>
            Beobachtet von
            <input
              type="text"
              value={by}
              maxLength={BY_MAX}
              placeholder="Kürzel"
              autoComplete="off"
              onInput={(e) => setBy(e.currentTarget.value)}
              onBlur={() => by !== d.settings.by && updateSettings({ by: by.trim() })}
            />
          </label>
          <label class="span-2">
            Notiz (optional, nur Fakten)
            <input
              type="text"
              value={note}
              maxLength={NOTE_MAX}
              autoComplete="off"
              onInput={(e) => setNote(e.currentTarget.value)}
            />
          </label>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            checked={fullText}
            onChange={(e) => setFullText(e.currentTarget.checked)}
          />
          Beschreibungen vollständig anzeigen
        </label>

        {AREAS.filter((a) => a.key !== 'P').map((area) => (
          <div class="crit-group" key={area.key}>
            <h3>
              {area.key} {area.name}
            </h3>
            <ul class="crit-list">
              {NEGATIVE_CRITERIA.filter((c) => c.area === area.key).map(criterionButton)}
            </ul>
          </div>
        ))}
        <div class="crit-group positive">
          <h3>Positiv (Bonus)</h3>
          <ul class="crit-list">{POSITIVE_CRITERIA.map(criterionButton)}</ul>
        </div>
      </Section>

      <Section title="Letzte Einträge">
        {recent.length === 0 ? (
          <p class="hint">Noch keine Einträge.</p>
        ) : (
          <ul class="entries">
            {recent.map((i) => (
              <li key={i.id}>
                <span class="entry-main">
                  <a href={routeHref({ name: 'kind', id: i.kidId })}>{kidName(i.kidId)}</a>
                  {': '}
                  <strong>{i.code}</strong> {getCriterion(i.code).name}
                  <span class="entry-meta">
                    {formatDate(i.date)}
                    {i.by && `, ${i.by}`}
                    {i.note && `, ${i.note}`}
                  </span>
                </span>
                <button
                  type="button"
                  class="btn small"
                  onClick={() => deleteIncidentWithUndo(i.id)}
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
