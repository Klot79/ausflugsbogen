import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { AMPEL_LABELS } from '../../domain/scoring';
import type { Ampel } from '../../domain/types';
import { useExternal } from '../../state/hooks';
import { getState, subscribe, type LoadState } from '../../state/store';
import { addKids } from '../../state/store';
import { showToast } from '../../state/ui';

/** Current data. Only used below <App>, which renders screens when data is ready. */
export function useData() {
  const s = useExternal<LoadState>(subscribe, getState);
  if (s.status !== 'ready') throw new Error('Daten nicht bereit');
  return s.data;
}

export function AmpelDot({ ampel }: { ampel: Ampel }) {
  return <span class={`dot dot-${ampel}`} aria-hidden="true" />;
}

/** Ampel always with text and points, never colour alone. */
export function AmpelTag({ ampel, net }: { ampel: Ampel; net?: number }) {
  return (
    <span class={`ampel-tag ampel-${ampel}`}>
      <AmpelDot ampel={ampel} />
      <span>
        {AMPEL_LABELS[ampel]}
        {net !== undefined && <>, {net} P.</>}
      </span>
    </span>
  );
}

export function SafetyTag() {
  return <span class="safety-tag">Sicherheit prüfen</span>;
}

export function Section(props: { title: string; children: ComponentChildren; class?: string }) {
  return (
    <section class={`card ${props.class ?? ''}`}>
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

export function SrOnly({ children }: { children: ComponentChildren }) {
  return <span class="sr-only">{children}</span>;
}

/** Textarea for several names: one per line or separated by commas. */
export function AddKidsForm({ onDone }: { onDone?: (count: number) => void }) {
  const [text, setText] = useState('');
  const submit = (e: Event) => {
    e.preventDefault();
    const added = addKids(text);
    if (added.length === 0) {
      showToast('Keine neuen Namen gefunden.');
      return;
    }
    setText('');
    showToast(
      added.length === 1 ? `${added[0]!.name} hinzugefügt.` : `${added.length} Kinder hinzugefügt.`,
    );
    onDone?.(added.length);
  };
  return (
    <form class="add-kids" onSubmit={submit}>
      <label for="add-kids-input">Namen (ein Name pro Zeile oder mit Komma getrennt)</label>
      <textarea
        id="add-kids-input"
        rows={4}
        value={text}
        onInput={(e) => setText(e.currentTarget.value)}
        placeholder={'Lea\nTom, Mia'}
      />
      <p class="hint">Nur Vornamen oder Kürzel verwenden.</p>
      <div class="row">
        <button type="submit" class="btn primary" disabled={!text.trim()}>
          Kinder hinzufügen
        </button>
      </div>
    </form>
  );
}
