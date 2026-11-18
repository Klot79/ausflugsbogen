import { today } from '../domain/dates';
import type { AppData } from '../domain/types';
import { DataError, toAppData } from './validate';

export const BACKUP_APP_ID = 'ausflugsbogen';
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: AppData;
}

/** Serialises all data into the backup JSON format. */
export function createBackup(data: AppData, now: Date = new Date()): string {
  const file: BackupFile = {
    app: BACKUP_APP_ID,
    schemaVersion: data.schemaVersion,
    exportedAt: now.toISOString(),
    data,
  };
  return JSON.stringify(file, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  return `ausflugsbogen-backup-${today(now)}.json`;
}

export interface BackupSummary {
  data: AppData;
  exportedAt: string;
  kids: number;
  incidents: number;
}

/**
 * Reads a backup file. Rejects invalid JSON, files of other apps and inconsistent data
 * with a German message (DataError).
 */
export function parseBackup(text: string): BackupSummary {
  if (text.length > BACKUP_MAX_BYTES) throw new DataError('Die Datei ist zu groß.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DataError('Die Datei ist keine gültige JSON-Datei.');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new DataError('Die Datei ist kein Backup des Ausflugsbogens.');
  }
  const file = parsed as Record<string, unknown>;
  if (file.app !== BACKUP_APP_ID || typeof file.data !== 'object' || file.data === null) {
    throw new DataError('Die Datei ist kein Backup des Ausflugsbogens.');
  }
  const data = toAppData(file.data);
  return {
    data,
    exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : '',
    kids: data.kids.length,
    incidents: data.incidents.length,
  };
}
