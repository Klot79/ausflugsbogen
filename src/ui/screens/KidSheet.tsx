import { useMemo, useState } from 'preact/hooks';
import { getCriterion } from '../../domain/criteria';
import { formatDate, isInPeriod, today } from '../../domain/dates';
import { emptyDecision } from '../../domain/defaults';
import { AMPEL_LABELS, maxPoints, recommendation, scoreKid } from '../../domain/scoring';
import {
  DECISION_LABELS,
  DECISION_VALUES,
  NAME_MAX,
  type Decision,
  type DecisionValue,
  type Kid,
} from '../../domain/types';
import { removeKid, renameKid, updateDecision } from '../../state/store';
import { confirmDialog, navigate, routeHref, showToast } from '../../state/ui';
import { deleteIncidentWithUndo } from '../actions';
import { AmpelDot, SafetyTag, Section, useData } from '../components/common';
import { PeriodLine } from '../components/PeriodLine';

export const TEAM_SENTENCE = 'Die Entscheidung trifft das Team mit der Schulleitung.';

export function KidSheet({ id }: { id: string }) {
  const d = useData();
  const kid = d.kids.find((k) => k.id === id);
  if (!kid) {
    return (
      <div class="screen">
        <Section title="Kind nicht gefunden">
          <p>Dieses Kind gibt es nicht mehr.</p>
          <a class="btn" href={routeHref({ name: 'klasse' })}>
            Zur Klasse
          </a>
        </Section>
      </div>
    );
  }
  return <Sheet key={kid.id} kid={kid} />;
}

function Sheet({ kid }: { kid: Kid }) {
  const d = useData();
  const s = d.settings;
  const score = useMemo(() => scoreKid(kid.id, d.incidents, s), [kid.id, d.incidents, s]);
  const decision = d.decisions[kid.id] ?? emptyDecision();
  const [name, setName] = useState(kid.name);
  const max = maxPoints(s.weights);

  const entries = useMemo(
    () =>
      d.incidents
        .filter((i) => i.kidId === kid.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [d.incidents, kid.id],
  );
  const scored = score.criteria.filter((c) => c.count > 0);

  const remove = async () => {
    const ok = await confirmDialog({
      title: `${kid.name} entfernen?`,
      message: `${kid.name} wird mit allen ${entries.length} Einträgen und der Dokumentation gelöscht. Das lässt sich nicht rückgängig machen.`,
      confirmLabel: 'Kind entfernen',
      danger: true,
    });
    if (!ok) return;
    navigate({ name: 'klasse' });
    removeKid(kid.id);
    showToast(`${kid.name} entfernt.`);
  };

  return (
    <div class="screen sheet">
      <div class="row wrap no-print">
        <a class="btn" href={routeHref({ name: 'klasse' })}>
          Zur Klasse
        </a>
        <span class="spacer" />
        <button type="button" class="btn primary" onClick={() => window.print()}>
          Einzelbogen drucken
        </button>
      </div>

      <header class="sheet-head">
        <p class="print-only print-title">
          Ausflugsbogen{s.trip && `: ${s.trip}`}
          {s.tripDate && `, ${formatDate(s.tripDate)}`}
        </p>
        <label class="no-print name-edit">
          <span class="sr-only">Name</span>
          <input
            type="text"
            class="name-input"
            value={name}
            maxLength={NAME_MAX}
            onInput={(e) => setName(e.currentTarget.value)}
            onBlur={() => {
              if (name.trim() && name.trim() !== kid.name) {
                renameKid(kid.id, name);
                showToast('Name gespeichert.');
              } else setName(kid.name);
            }}
          />
        </label>
        <h1 class="print-only">{kid.name}</h1>
        {kid.demo && <span class="demo-mark">Beispielkind</span>}
        <p class="hint">
          <PeriodLine settings={s} />
        </p>
      </header>

      <section class={`card big-ampel ampel-${score.ampel}`} aria-label="Ampel und Empfehlung">
        <div class="big-ampel-top">
          <AmpelDot ampel={score.ampel} />
          <div>
            <p class="big-ampel-label">{AMPEL_LABELS[score.ampel]}</p>
            <p class="big-ampel-points">
              {score.net} Punkte (netto) von höchstens {max}
            </p>
          </div>
          {score.safetyCheck && <SafetyTag />}
        </div>
        <h2>Empfehlung</h2>
        <p class="recommendation">{recommendation(score, s)}</p>
        <p class="team-note">
          <strong>{TEAM_SENTENCE}</strong> Die App gibt nur eine Empfehlung.
        </p>
      </section>

      <Section title="Auswertung">
        {scored.length === 0 ? (
          <p class="hint">Keine Vorfälle im Beobachtungszeitraum.</p>
        ) : (
          <table class="score-table">
            <thead>
              <tr>
                <th scope="col">Kriterium</th>
                <th scope="col" class="num">
                  Gewicht
                </th>
                <th scope="col" class="num">
                  Anzahl
                </th>
                <th scope="col" class="num">
                  Stufe
                </th>
                <th scope="col" class="num">
                  Punkte
                </th>
              </tr>
            </thead>
            <tbody>
              {scored.map((c) => (
                <tr key={c.code}>
                  <td>
                    <strong>{c.code}</strong> {getCriterion(c.code).name}
                  </td>
                  <td class="num">{c.weight}</td>
                  <td class="num">{c.count}</td>
                  <td class="num">{c.stufe}</td>
                  <td class="num">{c.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <dl class="totals">
          <div>
            <dt>Rohpunkte</dt>
            <dd>{score.raw}</dd>
          </div>
          <div>
            <dt>
              Bonus (positive Einträge: {score.positives}, höchstens {s.bonusCap})
            </dt>
            <dd>{score.bonus > 0 ? `minus ${score.bonus}` : '0'}</dd>
          </div>
          <div class="total-net">
            <dt>Netto</dt>
            <dd>{score.net}</dd>
          </div>
          <div>
            <dt>Einträge Sicherheit (A1 bis A3)</dt>
            <dd>
              {score.safetyCount}
              {s.safety > 0 ? ` (Prüfung ab ${s.safety})` : ' (Prüfung aus)'}
            </dd>
          </div>
        </dl>
      </Section>

      <Section title={`Alle Einträge (${entries.length})`} class="entries-card">
        {entries.length === 0 ? (
          <p class="hint">Noch keine Einträge.</p>
        ) : (
          <ul class="entries">
            {entries.map((i) => {
              const inside = isInPeriod(i.date, s.from, s.to);
              return (
                <li key={i.id} class={inside ? '' : 'outside'}>
                  <span class="entry-main">
                    <span class="entry-date">{formatDate(i.date)}</span> <strong>{i.code}</strong>{' '}
                    {getCriterion(i.code).name}
                    {!inside && <span class="outside-tag">außerhalb des Zeitraums</span>}
                    {(i.by || i.note) && (
                      <span class="entry-meta">
                        {i.by && `Beobachtet von ${i.by}`}
                        {i.by && i.note && '. '}
                        {i.note}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    class="btn small no-print"
                    onClick={() => deleteIncidentWithUndo(i.id)}
                  >
                    Löschen
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div class="print-keep">
        <DecisionForm kidId={kid.id} decision={decision} />

        <section class="print-only signatures">
          <h2>Unterschriften</h2>
          <div class="sig-grid">
            {['Lehrperson', 'Schulleitung', 'Eltern / Erziehungsberechtigte'].map((who) => (
              <div class="sig" key={who}>
                <div class="sig-line" />
                <span>{who}, Datum</span>
              </div>
            ))}
          </div>
          <p class="print-note">
            Erstellt am {formatDate(today())}. {TEAM_SENTENCE}
          </p>
        </section>
      </div>

      <div class="row no-print danger-zone">
        <button type="button" class="btn danger" onClick={remove}>
          Kind entfernen
        </button>
      </div>
    </div>
  );
}

function DecisionForm({ kidId, decision }: { kidId: string; decision: Decision }) {
  const [draft, setDraft] = useState(decision);
  const set = <K extends keyof Decision>(key: K, value: Decision[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const save = <K extends keyof Decision>(key: K, value: Decision[K] = draft[key]) => {
    if (value !== decision[key]) updateDecision(kidId, { [key]: value } as Partial<Decision>);
  };

  return (
    <Section title="Entscheidung und Dokumentation" class="decision">
      <p class="hint no-print">Wird beim Verlassen eines Feldes gespeichert.</p>
      <div class="grid-2">
        <label>
          Datum Elterngespräch
          <input
            type="date"
            value={draft.talkDate}
            onInput={(e) => set('talkDate', e.currentTarget.value)}
            onBlur={() => save('talkDate')}
          />
          <span class="print-value">{formatDate(draft.talkDate) || '-'}</span>
        </label>
        <label>
          Entscheidung
          <select
            value={draft.decision}
            onChange={(e) => {
              const v = e.currentTarget.value as DecisionValue;
              set('decision', v);
              save('decision', v);
            }}
          >
            {DECISION_VALUES.map((v) => (
              <option key={v} value={v}>
                {DECISION_LABELS[v]}
              </option>
            ))}
          </select>
          <span class="print-value">{DECISION_LABELS[draft.decision]}</span>
        </label>
      </div>
      <TextField
        label="Auflagen / Vereinbarung"
        value={draft.conditions}
        onInput={(v) => set('conditions', v)}
        onBlur={() => save('conditions')}
      />
      <TextField
        label="Begründung (nur Fakten)"
        value={draft.reason}
        onInput={(v) => set('reason', v)}
        onBlur={() => save('reason')}
      />
      <TextField
        label="Betreuung am Ausflugstag"
        value={draft.care}
        rows={2}
        onInput={(v) => set('care', v)}
        onBlur={() => save('care')}
      />
    </Section>
  );
}

function TextField(props: {
  label: string;
  value: string;
  rows?: number;
  onInput: (v: string) => void;
  onBlur: () => void;
}) {
  return (
    <label class="block">
      {props.label}
      <textarea
        rows={props.rows ?? 3}
        maxLength={2000}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        onBlur={props.onBlur}
      />
      <span class="print-value pre">{props.value || '-'}</span>
    </label>
  );
}
