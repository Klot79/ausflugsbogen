import { render } from 'preact';
import './styles/app.css';
import './styles/print.css';
import { registerServiceWorker } from './platform/device';
import { loadGrundschrift } from './platform/fonts';
import { requestPersistence } from './storage/db';
import { init, setSaveErrorHandler } from './state/store';
import { showToast } from './state/ui';
import { App } from './ui/App';

setSaveErrorHandler(() =>
  showToast('Speichern fehlgeschlagen. Bitte sofort ein Backup herunterladen.', undefined, true),
);

async function start() {
  const root = document.getElementById('app')!;
  const fontStatus = await loadGrundschrift();
  render(<App fontStatus={fontStatus} />, root);
  await init();
  void requestPersistence();
  registerServiceWorker();
}

void start();
