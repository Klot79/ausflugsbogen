/*
 * Central app state. Every change goes through `update`, which saves to IndexedDB.
 * Kept framework-free; the Preact hook lives in useStore.ts.
 */
import { initialAppData, removeDemo } from '../domain/demo';
import { emptyAppData, emptyDecision } from '../domain/defaults';
import { newId } from '../domain/ids';
import { parseKidNames } from '../domain/kids';
import {
  BY_MAX,
  NAME_MAX,
  NOTE_MAX,
  type AppData,
  type CriterionCode,
  type Decision,
  type Incident,
  type Kid,
  type Settings,
} from '../domain/types';
import { loadData, saveData } from '../storage/db';

export type LoadState =
  { status: 'loading' } | { status: 'ready'; data: AppData } | { status: 'error'; message: string };

type Listener = () => void;

let state: LoadState = { status: 'loading' };
const listeners = new Set<Listener>();
let saveQueue: Promise<void> = Promise.resolve();
let onSaveError: (err: unknown) => void = () => {};

export function getState(): LoadState {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

export function setSaveErrorHandler(fn: (err: unknown) => void): void {
  onSaveError = fn;
}

/** Data of the ready state. Throws if called before loading finished. */
export function data(): AppData {
  if (state.status !== 'ready') throw new Error('Daten sind noch nicht geladen.');
  return state.data;
}

function persist(next: AppData): void {
  saveQueue = saveQueue.then(() => saveData(next)).catch((err) => onSaveError(err));
}

/** Applies a change, re-renders and saves. */
export function update(fn: (d: AppData) => AppData): void {
  const next = fn(data());
  state = { status: 'ready', data: next };
  emit();
  persist(next);
}

/** Waits until all pending writes are done (used before reload / in tests). */
export function flush(): Promise<void> {
  return saveQueue;
}

export async function init(): Promise<void> {
  try {
    let loaded = await loadData();
    if (!loaded) {
      loaded = initialAppData();
      await saveData(loaded);
    }
    state = { status: 'ready', data: loaded };
  } catch (err) {
    state = {
      status: 'error',
      message:
        err instanceof Error
          ? `Die gespeicherten Daten konnten nicht gelesen werden: ${err.message}`
          : 'Die gespeicherten Daten konnten nicht gelesen werden.',
    };
  }
  emit();
}

/* ---------- Aktionen ---------- */

export function addKids(input: string): Kid[] {
  const names = parseKidNames(input, data().kids);
  const kids = names.map((name) => ({ id: newId(), name, demo: false }));
  if (kids.length) update((d) => ({ ...d, kids: [...d.kids, ...kids] }));
  return kids;
}

export function renameKid(id: string, name: string): void {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
  if (!clean) return;
  update((d) => ({ ...d, kids: d.kids.map((k) => (k.id === id ? { ...k, name: clean } : k)) }));
}

export function removeKid(id: string): void {
  update((d) => {
    const decisions = { ...d.decisions };
    delete decisions[id];
    return {
      ...d,
      kids: d.kids.filter((k) => k.id !== id),
      incidents: d.incidents.filter((i) => i.kidId !== id),
      decisions,
    };
  });
}

export function addIncident(input: {
  kidId: string;
  code: CriterionCode;
  date: string;
  note: string;
  by: string;
}): Incident {
  const incident: Incident = {
    id: newId(),
    kidId: input.kidId,
    code: input.code,
    date: input.date,
    note: input.note.trim().slice(0, NOTE_MAX),
    by: input.by.trim().slice(0, BY_MAX),
    createdAt: new Date().toISOString(),
  };
  update((d) => ({ ...d, incidents: [...d.incidents, incident] }));
  return incident;
}

export function removeIncident(id: string): Incident | undefined {
  const found = data().incidents.find((i) => i.id === id);
  if (found) update((d) => ({ ...d, incidents: d.incidents.filter((i) => i.id !== id) }));
  return found;
}

/** Puts an incident back (undo). Only if its child still exists. */
export function restoreIncident(incident: Incident): void {
  update((d) =>
    d.kids.some((k) => k.id === incident.kidId) && !d.incidents.some((i) => i.id === incident.id)
      ? { ...d, incidents: [...d.incidents, incident] }
      : d,
  );
}

export function updateSettings(patch: Partial<Settings>): void {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

export function replaceSettings(settings: Settings): void {
  update((d) => ({ ...d, settings }));
}

export function updateDecision(kidId: string, patch: Partial<Decision>): void {
  update((d) => ({
    ...d,
    decisions: {
      ...d.decisions,
      [kidId]: { ...(d.decisions[kidId] ?? emptyDecision()), ...patch },
    },
  }));
}

export function dropDemo(): void {
  update(removeDemo);
}

export function replaceAll(next: AppData): void {
  update(() => next);
}

export function deleteEverything(): void {
  update(() => emptyAppData());
}

export function markBackupDone(): void {
  update((d) => ({ ...d, meta: { ...d.meta, lastBackup: new Date().toISOString() } }));
}

export function dismissInstallHint(): void {
  update((d) => ({ ...d, meta: { ...d.meta, installHintDismissed: true } }));
}
