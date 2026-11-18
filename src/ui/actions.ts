/* UI-level actions that combine store changes with toasts, dialogs and downloads. */
import { daysBetween, today } from '../domain/dates';
import { hasDemo } from '../domain/demo';
import type { AppData } from '../domain/types';
import { backupFileName, createBackup, parseBackup } from '../storage/backup';
import { classCsv, csvFileName } from '../storage/csv';
import { downloadText } from '../storage/download';
import {
  data,
  deleteEverything,
  dropDemo,
  markBackupDone,
  removeIncident,
  replaceAll,
  restoreIncident,
} from '../state/store';
import { confirmDialog, showToast } from '../state/ui';
import { formatDate } from '../domain/dates';
import { DataError } from '../storage/validate';

export function deleteIncidentWithUndo(id: string): void {
  const removed = removeIncident(id);
  if (!removed) return;
  showToast(`Eintrag ${removed.code} gelöscht.`, () => restoreIncident(removed));
}

export function downloadBackup(): void {
  const now = new Date();
  // Mark first so the exported file already contains the new backup date.
  markBackupDone();
  downloadText(backupFileName(now), createBackup(data(), now), 'application/json');
  showToast('Backup heruntergeladen. Datei sicher aufbewahren.');
}

export function downloadCsv(): void {
  downloadText(csvFileName(), classCsv(data()), 'text/csv;charset=utf-8');
  showToast('Klassenübersicht als CSV heruntergeladen.');
}

export async function importBackupFile(file: File): Promise<void> {
  try {
    const summary = parseBackup(await file.text());
    const when = summary.exportedAt ? formatDate(today(new Date(summary.exportedAt))) : 'unbekannt';
    const ok = await confirmDialog({
      title: 'Backup einspielen?',
      message: `Das Backup vom ${when} enthält ${summary.kids} Kinder und ${summary.incidents} Einträge. Alle aktuellen Daten auf diesem Gerät werden dadurch ersetzt.`,
      confirmLabel: 'Ersetzen',
      danger: true,
    });
    if (!ok) return;
    replaceAll(summary.data);
    showToast('Backup eingespielt.');
  } catch (err) {
    const msg = err instanceof DataError ? err.message : 'Die Datei konnte nicht gelesen werden.';
    showToast(`Backup abgelehnt: ${msg}`, undefined, true);
  }
}

export async function removeDemoWithConfirm(): Promise<void> {
  const ok = await confirmDialog({
    title: 'Beispieldaten entfernen?',
    message:
      'Die drei Beispielkinder und ihre Einträge werden gelöscht. Deine eigenen Daten bleiben.',
    confirmLabel: 'Entfernen',
  });
  if (ok) {
    dropDemo();
    showToast('Beispieldaten entfernt.');
  }
}

export async function deleteAllWithConfirm(): Promise<void> {
  const ok = await confirmDialog({
    title: 'Alle Daten löschen?',
    message:
      'Alle Kinder, Einträge, Entscheidungen und Einstellungen werden auf diesem Gerät endgültig gelöscht. Das lässt sich nicht rückgängig machen. Vorher ein Backup herunterladen, falls du die Daten noch brauchst.',
    confirmLabel: 'Endgültig löschen',
    danger: true,
  });
  if (ok) {
    deleteEverything();
    showToast('Alle Daten gelöscht.');
  }
}

export const BACKUP_REMINDER_DAYS = 14;

/** Reminder needed when real (non-demo) data exists and the last backup is old or missing. */
export function backupReminder(d: AppData, now: Date = new Date()): string | null {
  const hasRealData = d.kids.some((k) => !k.demo);
  if (!hasRealData) return null;
  if (!d.meta.lastBackup) return 'Es gibt noch kein Backup deiner Daten.';
  const days = daysBetween(today(new Date(d.meta.lastBackup)), today(now));
  if (days > BACKUP_REMINDER_DAYS) return `Das letzte Backup ist ${days} Tage alt.`;
  return null;
}

export { hasDemo };
