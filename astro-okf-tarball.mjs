// Astro integration: package the generated /okf/ tree into /okf.tar.gz.
//
// The OKF bundle is emitted as Markdown files by the endpoints under
// src/pages/okf/. OKF's spec leaves packaging undefined, so we ship both the
// browsable tree (served as text/markdown) and a single gzipped tar for
// "take everything" consumers. Node has no bundled tar library, so we write a
// minimal POSIX ustar archive by hand and gzip it with the built-in zlib —
// keeping the repo's no-extra-dependency stance.
//
// Runs in astro:build:done, after the .md files are written to dist/okf/.
// File order and mtime are fixed so the tarball is byte-reproducible.

import { gzipSync } from "node:zlib";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BLOCK = 512;

function octal(n, len) {
  // len includes the trailing NUL terminator slot.
  return n.toString(8).padStart(len - 1, "0") + "\0";
}

function ustarHeader(name, size) {
  const buf = Buffer.alloc(BLOCK);
  if (Buffer.byteLength(name) > 100) {
    throw new Error(`okf-tarball: path too long for ustar name field: ${name}`);
  }
  buf.write(name, 0, 100, "utf8"); // name
  buf.write("0000644\0", 100, 8, "ascii"); // mode (rw-r--r--)
  buf.write("0000000\0", 108, 8, "ascii"); // uid
  buf.write("0000000\0", 116, 8, "ascii"); // gid
  buf.write(octal(size, 12), 124, 12, "ascii"); // size
  buf.write(octal(0, 12), 136, 12, "ascii"); // mtime (fixed epoch → reproducible)
  buf.write("        ", 148, 8, "ascii"); // chksum placeholder (8 spaces)
  buf.write("0", 156, 1, "ascii"); // typeflag: regular file
  buf.write("ustar\0", 257, 6, "ascii"); // magic
  buf.write("00", 263, 2, "ascii"); // version

  // Checksum = sum of all header bytes with chksum field as spaces.
  let sum = 0;
  for (let i = 0; i < BLOCK; i++) sum += buf[i];
  buf.write(octal(sum, 7), 148, 7, "ascii"); // 6 octal digits + NUL
  buf.write(" ", 155, 1, "ascii"); // trailing space
  return buf;
}

async function walk(dir) {
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(full)));
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

export default function okfTarball() {
  return {
    name: "okf-tarball",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const okfDir = join(outDir, "okf");
        let files;
        try {
          files = await walk(okfDir);
        } catch {
          logger.warn("no dist/okf tree found — skipping okf.tar.gz");
          return;
        }
        // Archive paths are bundle-relative, prefixed with okf/ so the tar
        // extracts into an okf/ directory. Sorted for reproducibility.
        const records = files
          .map((f) => ({
            name: "okf/" + relative(okfDir, f).split(/[/\\]/).join("/"),
            path: f,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const chunks = [];
        for (const r of records) {
          const content = await readFile(r.path);
          chunks.push(ustarHeader(r.name, content.length));
          chunks.push(content);
          const pad = (BLOCK - (content.length % BLOCK)) % BLOCK;
          if (pad) chunks.push(Buffer.alloc(pad));
        }
        // Two zero blocks terminate the archive.
        chunks.push(Buffer.alloc(BLOCK * 2));

        const tar = Buffer.concat(chunks);
        const gz = gzipSync(tar, { level: 9 });
        await writeFile(join(outDir, "okf.tar.gz"), gz);
        logger.info(
          `wrote okf.tar.gz (${records.length} files, ${gz.length} bytes)`,
        );
      },
    },
  };
}
