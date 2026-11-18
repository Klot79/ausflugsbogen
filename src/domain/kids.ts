import { NAME_MAX, type Kid } from './types';

/**
 * Splits the "add children" input into names: one per line or separated by commas.
 * Trims, drops empty entries and duplicates (case-insensitive), cuts to NAME_MAX.
 */
export function parseKidNames(input: string, existing: readonly Kid[] = []): string[] {
  const seen = new Set(existing.map((k) => k.name.trim().toLocaleLowerCase('de')));
  const out: string[] = [];
  for (const part of input.split(/[\n,;]+/)) {
    const name = part.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX);
    if (!name) continue;
    const key = name.toLocaleLowerCase('de');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function sortKidsByName<T extends { name: string }>(kids: readonly T[]): T[] {
  return [...kids].sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
}
