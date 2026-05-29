// Generate raster icons + Open Graph image from inline SVGs at build time.
// Output goes into ./public so favicons and OG sit at predictable URLs.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'public');
await mkdir(out, { recursive: true });

const accent = '#163fa6';

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <rect width="512" height="512" rx="96" fill="${accent}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    fill="#ffffff" font-family="ui-monospace, Menlo, Consolas, monospace"
    font-weight="700" font-size="220" letter-spacing="-8">W/</text>
</svg>`;

// Maskable: same mark on a safe-zone padded background per W3C maskable spec.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <rect width="512" height="512" fill="${accent}"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
    fill="#ffffff" font-family="ui-monospace, Menlo, Consolas, monospace"
    font-weight="700" font-size="160" letter-spacing="-6">W/</text>
</svg>`;

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" role="img">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#eef4ff"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="630" fill="${accent}"/>
  <g transform="translate(80,110)">
    <rect width="92" height="92" rx="16" fill="${accent}"/>
    <text x="46" y="46" text-anchor="middle" dominant-baseline="central"
      fill="#ffffff" font-family="ui-monospace, Menlo, Consolas, monospace"
      font-weight="700" font-size="42" letter-spacing="-2">W/</text>
  </g>
  <g transform="translate(80,250)" fill="#0e0e13" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <text x="0" y="0" font-size="72" font-weight="800" letter-spacing="-2">What a good website does.</text>
    <text x="0" y="100" font-size="32" font-weight="500" fill="#3f3f48">A platform-agnostic spec — SEO, accessibility,</text>
    <text x="0" y="142" font-size="32" font-weight="500" fill="#3f3f48">security, well-known URIs, agent readiness.</text>
  </g>
  <g transform="translate(80,560)" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#5b5b66">
    <text x="0" y="0">specification.website</text>
  </g>
  <g transform="translate(1120,560)" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="22" fill="#5b5b66" text-anchor="end">
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
