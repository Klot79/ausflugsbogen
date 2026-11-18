/*
 * Loads "Grundschrift" from src/assets/fonts/ (local files, bundled by Vite).
 * If the files are missing, the app uses the system font and says so visibly
 * (footer + settings). It never silently swaps in another web font.
 */

const files = import.meta.glob('../assets/fonts/Grundschrift-*.otf', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

function urlFor(name: string): string | undefined {
  return Object.entries(files).find(([path]) => path.endsWith(`/${name}`))?.[1];
}

export type FontStatus = 'ok' | 'installed' | 'missing' | 'partial' | 'error';

/** Is a font with this family name installed on the device? (width comparison trick) */
function isInstalled(family: string): boolean {
  try {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return false;
    const sample = 'mmmmmmmmmmlliWWQ@0123456789';
    return ['monospace', 'serif'].some((base) => {
      ctx.font = `32px ${base}`;
      const w1 = ctx.measureText(sample).width;
      ctx.font = `32px "${family}", ${base}`;
      return ctx.measureText(sample).width !== w1;
    });
  } catch {
    return false;
  }
}

export async function loadGrundschrift(): Promise<FontStatus> {
  const regular = urlFor('Grundschrift-Regular.otf');
  const bold = urlFor('Grundschrift-Bold.otf');
  if (!regular && !bold) return isInstalled('Grundschrift') ? 'installed' : 'missing';
  if (typeof FontFace === 'undefined') return 'error';
  try {
    const faces: FontFace[] = [];
    if (regular) faces.push(new FontFace('Grundschrift', `url("${regular}")`, { weight: '400' }));
    if (bold) faces.push(new FontFace('Grundschrift', `url("${bold}")`, { weight: '700' }));
    await Promise.all(faces.map((f) => f.load()));
    for (const f of faces) document.fonts.add(f);
    return regular && bold ? 'ok' : 'partial';
  } catch {
    return 'error';
  }
}

export const FONT_STATUS_TEXT: Record<FontStatus, string> = {
  ok: 'Grundschrift ist aktiv.',
  installed:
    'Grundschrift ist nicht in der App enthalten, aber auf diesem Gerät installiert und wird verwendet. Auf anderen Geräten erscheint die Systemschrift. Schriftdateien nach src/assets/fonts/ legen und neu bauen.',
  partial:
    'Grundschrift nur teilweise gefunden (Regular oder Bold fehlt). Fehlender Schnitt wird von der Systemschrift ersetzt.',
  missing:
    'Grundschrift nicht gefunden. Es wird die Systemschrift verwendet. Schriftdateien nach src/assets/fonts/ legen und neu bauen.',
  error: 'Grundschrift konnte nicht geladen werden. Es wird die Systemschrift verwendet.',
};
