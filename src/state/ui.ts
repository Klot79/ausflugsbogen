/*
 * Small UI stores: toast with undo, in-page confirmation dialog, hash router.
 * No window.confirm / alert anywhere in the app.
 */

type Listener = () => void;

function createSignal<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      for (const fn of listeners) fn();
    },
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

/* ---------- Toast ---------- */

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
  error?: boolean;
}

export const UNDO_MS = 9000;
export const toastSignal = createSignal<Toast | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let toastSeq = 0;

export function showToast(message: string, undo?: () => void, error = false): void {
  clearTimeout(toastTimer);
  toastSeq += 1;
  toastSignal.set({ id: toastSeq, message, undo, error });
  toastTimer = setTimeout(() => toastSignal.set(null), undo ? UNDO_MS : 4000);
}

export function hideToast(): void {
  clearTimeout(toastTimer);
  toastSignal.set(null);
}

/* ---------- Bestätigungsdialog ---------- */

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

export const confirmSignal = createSignal<ConfirmRequest | null>(null);

export function confirmDialog(opts: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  return new Promise((resolve) => {
    confirmSignal.set({
      ...opts,
      resolve: (ok) => {
        confirmSignal.set(null);
        resolve(ok);
      },
    });
  });
}

/* ---------- Router (Hash) ---------- */

export type Route =
  | { name: 'erfassen' }
  | { name: 'klasse' }
  | { name: 'kind'; id: string }
  | { name: 'einstellungen' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/');
  switch (parts[0]) {
    case 'klasse':
      return { name: 'klasse' };
    case 'kind':
      return parts[1] ? { name: 'kind', id: decodeURIComponent(parts[1]) } : { name: 'klasse' };
    case 'einstellungen':
      return { name: 'einstellungen' };
    default:
      return { name: 'erfassen' };
  }
}

export function routeHref(route: Route): string {
  return route.name === 'kind' ? `#/kind/${encodeURIComponent(route.id)}` : `#/${route.name}`;
}

export const routeSignal = createSignal<Route>(
  typeof location !== 'undefined' ? parseHash(location.hash) : { name: 'erfassen' },
);

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    routeSignal.set(parseHash(location.hash));
    window.scrollTo(0, 0);
  });
}

export function navigate(route: Route): void {
  location.hash = routeHref(route);
}

/* ---------- Auswahl auf dem Erfassen-Bildschirm (bleibt beim Tab-Wechsel) ---------- */

export const selectedKidSignal = createSignal<string | null>(null);
