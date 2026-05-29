// Generate raster icons + Open Graph image from inline SVGs at build time.
// Output goes into ./public so favicons and OG sit at predictable URLs.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'public');
await mkdir(out, { recursive: true });

const accent = '#15803d';      // green-700 — base
const accentLight = '#f0fdf4'; // green-50  — OG background tint

// The mark: a W whose final upstroke shoots past cap height to form a
// checkmark tail. Single stroked path, round caps & joins for a clean
// icon read. Path is on a 0..64 grid and scaled per size.
//
//   M (top-left)  L (valley 1)  L (mid peak)  L (valley 2)  L (check tail)
const WCheck = (cx, cy, scale, stroke) => {
  const pt = (x, y) => `${cx + (x - 32) * scale},${cy + (y - 32) * scale}`;
  // Path on 64x64 reference grid, sized to leave ~9-unit margin on every
  // side after the stroke radius is accounted for:
  // 12,26 → 22,46 → 30,31 → 38,46 → 52,18
  const d = [
    `M${pt(12, 26)}`,
    `L${pt(22, 46)}`,
    `L${pt(30, 31)}`,
    `L${pt(38, 46)}`,
    `L${pt(52, 18)}`,
  ].join(' ');
  return `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <rect width="512" height="512" rx="96" fill="${accent}"/>
  ${WCheck(256, 256, 7.5, 48)}
</svg>`;

// Maskable: per W3C maskable spec, the mark must fit inside an inscribed
// circle of ~80% diameter, leaving safe zone for launcher masks. Same
// shape, smaller scale.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <rect width="512" height="512" fill="${accent}"/>
  ${WCheck(256, 256, 5, 36)}
</svg>`;

// OG layout (1200×630):
//   y  80–168  : icon (88×88) + brand name next to it
//   y 280–430  : headline + two-line sub
//   y 560–582  : footer (URL ← / licence →)
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${accentLight}"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="630" fill="${accent}"/>

  <!-- Icon + brand -->
  <g transform="translate(80,80)">
    <rect width="88" height="88" rx="14" fill="${accent}"/>
    ${WCheck(44, 44, 1.375, 8)}
  </g>
  <g transform="translate(184,116)" fill="#0e0e13" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <text x="0" y="0" font-size="26" font-weight="700" letter-spacing="-0.5">The Website Specification</text>
    <text x="0" y="28" font-size="18" font-weight="500" fill="#5b5b66">specification.website</text>
  </g>

  <!-- Headline + sub -->
  <g transform="translate(80,280)" fill="#0e0e13" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <text x="0" y="0" font-size="72" font-weight="800" letter-spacing="-2">What a good website does.</text>
    <text x="0" y="92" font-size="32" font-weight="500" fill="#3f3f48">A platform-agnostic spec — SEO, accessibility,</text>
    <text x="0" y="134" font-size="32" font-weight="500" fill="#3f3f48">security, well-known URIs, agent readiness.</text>
  </g>

  <!-- Footer -->
  <g transform="translate(80,570)" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#5b5b66">
    <text x="0" y="0">github.com/jdevalk/specification.website</text>
  </g>
  <g transform="translate(1120,570)" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#5b5b66" text-anchor="end">
    <text x="0" y="0">MIT · CC BY 4.0</text>
  </g>
</svg>`;

async function png(svg, size, file) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(join(out, file));
  console.log(`  wrote /${file} (${size}×${size})`);
}

console.log('Generating assets…');
await png(iconSvg, 192, 'icon-192.png');
await png(iconSvg, 512, 'icon-512.png');
await png(maskableSvg, 512, 'icon-maskable-512.png');
await png(iconSvg, 180, 'apple-touch-icon.png');

// ICO: 16×16 + 32×32 PNGs packed by sharp.
const ico16 = await sharp(Buffer.from(iconSvg)).resize(16, 16).png().toBuffer();
const ico32 = await sharp(Buffer.from(iconSvg)).resize(32, 32).png().toBuffer();
// Tiny .ico encoder (ICONDIR + 2 ICONDIRENTRY + 2 PNG payloads)
function ico(images) {
  const dir = Buffer.alloc(6 + images.length * 16);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type 1 = icon
  dir.writeUInt16LE(images.length, 4);
  let offset = dir.length;
  images.forEach((buf, i) => {
    const sz = i === 0 ? 16 : 32;
    const off = 6 + i * 16;
    dir.writeUInt8(sz === 256 ? 0 : sz, off + 0); // width
    dir.writeUInt8(sz === 256 ? 0 : sz, off + 1); // height
    dir.writeUInt8(0, off + 2); // colours
    dir.writeUInt8(0, off + 3); // reserved
    dir.writeUInt16LE(1, off + 4); // planes
    dir.writeUInt16LE(32, off + 6); // bpp
    dir.writeUInt32LE(buf.length, off + 8); // size
    dir.writeUInt32LE(offset, off + 12); // offset
    offset += buf.length;
  });
  return Buffer.concat([dir, ...images]);
}
await writeFile(join(out, 'favicon.ico'), ico([ico16, ico32]));
console.log('  wrote /favicon.ico (16+32)');

// Open Graph 1200×630 PNG
await sharp(Buffer.from(ogSvg))
  .resize(1200, 630)
  .png({ quality: 90, compressionLevel: 9 })
  .toFile(join(out, 'og-default.png'));
console.log('  wrote /og-default.png (1200×630)');

console.log('Done.');
