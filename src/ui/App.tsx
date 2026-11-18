import { useState } from 'preact/hooks';
import { formatDate } from '../domain/dates';
import { hasDemo } from '../domain/demo';
import { isIOS, isStandalone } from '../platform/device';
import { FONT_STATUS_TEXT, type FontStatus } from '../platform/fonts';
import { useExternal } from '../state/hooks';
import { dismissInstallHint, getState, subscribe, type LoadState } from '../state/store';
import { routeHref, routeSignal, type Route } from '../state/ui';
import { backupReminder, downloadBackup, removeDemoWithConfirm } from './actions';
import { ConfirmHost, ToastHost } from './components/overlays';
import { Capture } from './screens/Capture';
import { ClassView } from './screens/ClassView';
import { KidSheet } from './screens/KidSheet';
import { SettingsScreen } from './screens/SettingsScreen';

const TABS: { route: Route; label: string }[] = [
  { route: { name: 'erfassen' }, label: 'Erfassen' },
  { route: { name: 'klasse' }, label: 'Klasse' },
  { route: { name: 'einstellungen' }, label: 'Einstellungen' },
];

export function App({ fontStatus }: { fontStatus: FontStatus }) {
  const state = useExternal<LoadState>(subscribe, getState);
  const route = useExternal(routeSignal.subscribe, routeSignal.get);

  if (state.status === 'loading') {
    return <p class="loading">Daten werden geladen ...</p>;
  }
  if (state.status === 'error') {
    return (
      <main class="screen">
        <div class="banner warn alert" role="alert">
          <h1>Daten konnten nicht geladen werden</h1>
          <p>{state.message}</p>
          <p>
            Die Daten wurden nicht verändert. Bitte die Seite neu laden oder ein Backup einspielen.
          </p>
        </div>
      </main>
    );
  }

  const d = state.data;
  const activeTab = route.name === 'kind' ? 'klasse' : route.name;

  return (
    <>
      <header class="app-header no-print">
        <div class="app-title">
          <span class="app-name">Ausflugsbogen</span>
          {(d.settings.trip || d.settings.tripDate) && (
            <span class="app-trip">
              {d.settings.trip}
              {d.settings.trip && d.settings.tripDate && ', '}
              {d.settings.tripDate && formatDate(d.settings.tripDate)}
            </span>
          )}
        </div>
        <p class="app-disclaimer">
          Die App gibt nur eine Empfehlung. Die Entscheidung trifft das Team mit der Schulleitung.
        </p>
      </header>

      <div class="banners no-print">
        {hasDemo(d) && (
          <div class="banner demo">
            <span>Es sind Beispieldaten geladen (Beispielkind A, B, C).</span>
            <button type="button" class="btn small" onClick={removeDemoWithConfirm}>
              Beispieldaten entfernen
            </button>
          </div>
        )}
        <InstallHint dismissed={d.meta.installHintDismissed} />
        <BackupBanner message={backupReminder(d)} />
      </div>

      <main id="main">
        {route.name === 'erfassen' && <Capture />}
        {route.name === 'klasse' && <ClassView />}
        {route.name === 'kind' && <KidSheet id={route.id} />}
        {route.name === 'einstellungen' && <SettingsScreen fontStatus={fontStatus} />}
      </main>

      {fontStatus !== 'ok' && (
        <p class="font-note no-print" role="note">
          {FONT_STATUS_TEXT[fontStatus]}
        </p>
      )}

      <nav class="tabbar no-print" aria-label="Hauptnavigation">
        {TABS.map((t) => (
          <a
            key={t.label}
            href={routeHref(t.route)}
            class={activeTab === t.route.name ? 'active' : ''}
            aria-current={activeTab === t.route.name ? 'page' : undefined}
          >
            {t.label}
          </a>
        ))}
      </nav>

      <ToastHost />
      <ConfirmHost />
    </>
  );
}

function InstallHint({ dismissed }: { dismissed: boolean }) {
  const [show] = useState(() => !dismissed && isIOS() && !isStandalone());
  if (!show || dismissed) return null;
  return (
    <div class="banner info">
      <span>
        <strong>Zum Home-Bildschirm hinzufügen:</strong> In Safari auf "Teilen" tippen, dann "Zum
        Home-Bildschirm". So bleiben die Daten sicherer gespeichert und die App funktioniert
        offline.
      </span>
      <button type="button" class="btn small" onClick={dismissInstallHint}>
        Ausblenden
      </button>
    </div>
  );
}

function BackupBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div class="banner warn">
      <span>
        <strong>Backup-Erinnerung:</strong> {message} Die Daten liegen nur auf diesem Gerät.
      </span>
      <button type="button" class="btn small primary" onClick={downloadBackup}>
        Backup jetzt
      </button>
    </div>
  );
}
