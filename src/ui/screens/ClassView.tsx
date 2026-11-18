import { useMemo, useState } from 'preact/hooks';
import { formatDate, today } from '../../domain/dates';
import { sortKidsByName } from '../../domain/kids';
import { AMPEL_LABELS, AMPEL_ORDER, scoreKid } from '../../domain/scoring';
import { DECISION_LABELS, type Ampel } from '../../domain/types';
import { routeHref } from '../../state/ui';
import { downloadCsv } from '../actions';
import { AddKidsForm, AmpelDot, AmpelTag, SafetyTag, Section, useData } from '../components/common';
import { PeriodLine } from '../components/PeriodLine';

type Sort = 'punkte' | 'name';

export function ClassView() {
  const d = useData();
  const [sort, setSort] = useState<Sort>('punkte');
  const [showAdd, setShowAdd] = useState(false);

  const rows = useMemo(() => {
    const list = sortKidsByName(d.kids).map((kid) => ({
      kid,
      score: scoreKid(kid.id, d.incidents, d.settings),
      decision: d.decisions[kid.id]?.decision ?? 'offen',
    }));
    if (sort === 'punkte') list.sort((a, b) => b.score.net - a.score.net);
    return list;
  }, [d, sort]);

  const counts = useMemo(() => {
    const c: Record<Ampel, number> = { gruen: 0, gelb: 0, orange: 0, rot: 0 };
    for (const r of rows) c[r.score.ampel] += 1;
    return c;
  }, [rows]);

  return (
    <div class="screen">
      <header class="print-only print-head">
        <h1>Klassenübersicht Ausflug{d.settings.trip && `: ${d.settings.trip}`}</h1>
        <PeriodLine settings={d.settings} />
        <p>Gedruckt am {formatDate(today())}</p>
      </header>

      <Section title="Ampel in der Klasse">
        <ul class="ampel-counts">
          {AMPEL_ORDER.map((a) => (
            <li key={a} class={`ampel-count ampel-${a}`}>
              <AmpelDot ampel={a} />
              <span class="count-num">{counts[a]}</span>
              <span>{AMPEL_LABELS[a]}</span>
            </li>
          ))}
        </ul>
        <p class="hint no-print">
          <PeriodLine settings={d.settings} />
        </p>
      </Section>

      <Section title={`Kinder (${rows.length})`}>
        <div class="row wrap no-print">
          <div class="segmented" role="group" aria-label="Sortierung">
            <button
              type="button"
              aria-pressed={sort === 'punkte'}
              onClick={() => setSort('punkte')}
            >
              Nach Punkten
            </button>
            <button type="button" aria-pressed={sort === 'name'} onClick={() => setSort('name')}>
              A bis Z
            </button>
          </div>
          <span class="spacer" />
          <button
            type="button"
            class="btn"
            onClick={() => setShowAdd(!showAdd)}
            aria-expanded={showAdd}
          >
            Kinder hinzufügen
          </button>
        </div>
        {showAdd && <AddKidsForm onDone={() => setShowAdd(false)} />}

        {rows.length === 0 ? (
          <p class="hint">Noch keine Kinder. Über "Kinder hinzufügen" anlegen.</p>
        ) : (
          <table class="class-table">
            <thead>
              <tr>
                <th scope="col">Kind</th>
                <th scope="col">Ampel</th>
                <th scope="col" class="num">
                  Punkte
                </th>
                <th scope="col" class="num">
                  Einträge
                </th>
                <th scope="col">Hinweis</th>
                <th scope="col" class="print-only">
                  Entscheidung
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ kid, score, decision }) => (
                <tr key={kid.id}>
                  <td>
                    <a href={routeHref({ name: 'kind', id: kid.id })} class="kid-link">
                      {kid.name}
                    </a>
                    {kid.demo && <span class="demo-mark">Beispiel</span>}
                  </td>
                  <td>
                    <AmpelTag ampel={score.ampel} />
                  </td>
                  <td class="num">{score.net}</td>
                  <td class="num">{score.entriesInPeriod}</td>
                  <td>{score.safetyCheck && <SafetyTag />}</td>
                  <td class="print-only">{DECISION_LABELS[decision]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div class="row wrap no-print">
          <button type="button" class="btn" onClick={() => window.print()}>
            Übersicht drucken
          </button>
          <button type="button" class="btn" onClick={downloadCsv} disabled={rows.length === 0}>
            Als CSV exportieren
          </button>
        </div>
      </Section>
      <p class="print-only print-note">
        Die Ampel ist eine Empfehlung nach festen Regeln. Die Entscheidung trifft das Team mit der
        Schulleitung.
      </p>
    </div>
  );
}
