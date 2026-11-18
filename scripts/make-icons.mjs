// Erzeugt die App-Icons (Ampel auf blauem Grund) als PNG, ohne externe Abhängigkeiten.
// Aufruf: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BRAND = [31, 78, 121];
const HOUSING = [27, 36, 48];
const LIGHTS = [
  [198, 40, 40],
  [242, 194, 0],
  [46, 125, 50],
];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Signed distance to a rounded rectangle centred at (cx, cy). */
function roundRect(x, y, cx, cy, w, h, r) {
  const dx = Math.abs(x - cx) - (w / 2 - r);
  const dy = Math.abs(y - cy) - (h / 2 - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

function cover(d) {
  return Math.max(0, Math.min(1, 0.5 - d));
}

function blend(base, color, a) {
  return base.map((v, i) => Math.round(v * (1 - a) + color[i] * a));
}

/**
 * @param size icon size in px
 * @param opts.fullBleed background fills the square (maskable / apple)
 * @param opts.scale size of the traffic light relative to the icon
 */
function icon(size, { fullBleed, scale }) {
  const s = size;
  return png(size, (x, y) => {
    let a = fullBleed ? 1 : cover(roundRect(x, y, s / 2, s / 2, s, s, s * 0.2));
    let c = [...BRAND];
    const hw = s * 0.36 * scale;
    const hh = s * 0.84 * scale;
    c = blend(c, HOUSING, cover(roundRect(x, y, s / 2, s / 2, hw, hh, hw * 0.35)));
    const r = hw * 0.32;
    LIGHTS.forEach((col, i) => {
      const cy = s / 2 + (i - 1) * hh * 0.3;
      c = blend(c, col, cover(Math.hypot(x - s / 2, y - cy) - r));
    });
    return [...c, Math.round(a * 255)];
  });
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192, { fullBleed: false, scale: 1 }));
writeFileSync('public/icons/icon-512.png', icon(512, { fullBleed: false, scale: 1 }));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, { fullBleed: true, scale: 0.72 }));
writeFileSync('public/icons/apple-touch-icon.png', icon(180, { fullBleed: true, scale: 0.9 }));
console.log('Icons erzeugt in public/icons/');
