/*
 * Local storage in IndexedDB (via idb-keyval). Data never leaves the device.
 */
import { createStore, del, get, set } from 'idb-keyval';
import type { AppData } from '../domain/types';
import { toAppData } from './validate';

const store = createStore('ausflugsbogen', 'data');
const KEY = 'appData';

/** Loads saved data. Returns null on the very first start. */
export async function loadData(): Promise<AppData | null> {
  const raw = await get<unknown>(KEY, store);
  if (raw === undefined) return null;
  return toAppData(raw);
}

export async function saveData(data: AppData): Promise<void> {
  await set(KEY, data, store);
}

export async function clearData(): Promise<void> {
  await del(KEY, store);
}

/** Asks the browser to keep the data even when storage runs low. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* not supported */
  }
  return false;
}
