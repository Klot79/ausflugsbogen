import { createHash } from 'node:crypto';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';

/** Lists all files below a directory (relative paths, forward slashes). */
function listFiles(dir: string, root = dir): string[] {
  let out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(listFiles(full, root));
    else out.push(relative(root, full).split('\\').join('/'));
  }
  return out;
}

/**
 * Generates a small service worker at build time that precaches every file of the build
 * (hashed assets, index.html, manifest, icons). The app then runs fully offline.
 * No runtime requests to other origins are made or cached.
 */
export function serviceWorkerPlugin(publicDir = 'public'): Plugin {
  return {
    name: 'ausflugsbogen-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = new Set<string>(Object.keys(bundle));
      for (const f of listFiles(publicDir)) files.add(f);
      files.add('index.html'); // emitted by Vite after this hook, but always present
      files.delete('sw.js');
      const assets = ['./', ...[...files].sort().map((f) => './' + f)];
      const version = createHash('sha256').update(assets.join('|')).digest('hex').slice(0, 12);
      const source = `/* Automatisch erzeugt beim Build. Nicht von Hand bearbeiten. */
const CACHE = 'ausflugsbogen-${version}';
const ASSETS = ${JSON.stringify(assets, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ausflugsbogen-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches
          .match('./index.html', { ignoreVary: true })
          .then((hit) => hit || caches.match('./', { ignoreVary: true })),
      ),
    );
    return;
  }
  // ignoreVary: servers may send "Vary: Origin", and module scripts carry an Origin header.
  event.respondWith(caches.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req)));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}
