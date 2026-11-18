import { useEffect, useRef } from 'preact/hooks';
import { useExternal } from '../../state/hooks';
import { confirmSignal, hideToast, toastSignal } from '../../state/ui';

export function ToastHost() {
  const toast = useExternal(toastSignal.subscribe, toastSignal.get);
  return (
    <div class="toast-region no-print" role="status" aria-live="polite">
      {toast && (
        <div class={`toast ${toast.error ? 'toast-error' : ''}`} key={toast.id}>
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              class="btn toast-undo"
              onClick={() => {
                toast.undo?.();
                hideToast();
              }}
            >
              Rückgängig
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** In-page confirmation dialog (replaces window.confirm). */
export function ConfirmHost() {
  const req = useExternal(confirmSignal.subscribe, confirmSignal.get);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!req) return;
    lastFocus.current = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') req.resolve(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      (lastFocus.current as HTMLElement | null)?.focus?.();
    };
  }, [req]);

  if (!req) return null;
  return (
    <div class="modal-backdrop no-print" onClick={() => req.resolve(false)}>
      <div
        class="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-msg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{req.title}</h2>
        <p id="confirm-msg">{req.message}</p>
        <div class="row end">
          <button ref={cancelRef} type="button" class="btn" onClick={() => req.resolve(false)}>
            Abbrechen
          </button>
          <button
            type="button"
            class={`btn ${req.danger ? 'danger' : 'primary'}`}
            onClick={() => req.resolve(true)}
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
