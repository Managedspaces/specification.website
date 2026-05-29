// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const SITE = 'https://specification.website';

/**
 * Build a map of canonical URL -> last-modified date, derived from the `updated`
 * front matter of every spec entry. This is the same source of truth the RSS feed
 * and the spec pages use, so the sitemap's <lastmod> stays in sync automatically.
 */
function buildLastmodMap() {
  const specDir = fileURLToPath(new URL('./src/content/spec', import.meta.url));
  /** @type {Map<string, string>} per-URL lastmod (YYYY-MM-DD) */
  const urls = new Map();
  /** @type {Map<string, string>} per-category newest lastmod */
  const byCategory = new Map();
  let newest = '';

  for (const category of readdirSync(specDir, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const catDir = `${specDir}/${category.name}`;
    for (const file of readdirSync(catDir)) {
      if (!/\.(md|mdx)$/.test(file)) continue;
      const raw = readFileSync(`${catDir}/${file}`, 'utf8');
      const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fm) continue;
      const front = fm[1];
      if (/^draft:\s*true\s*$/m.test(front)) continue;

      const updated = front.match(/^updated:\s*["']?([0-9]{4}-[0-9]{2}-[0-9]{2})["']?\s*$/m)?.[1];
      if (!updated) continue;
      const cat = front.match(/^category:\s*["']?([\w-]+)["']?\s*$/m)?.[1] ?? category.name;
      const slug =
        front.match(/^slug:\s*["']?([\w-]+)["']?\s*$/m)?.[1] ?? file.replace(/\.(md|mdx)$/, '');

      urls.set(`${SITE}/spec/${cat}/${slug}/`, updated);

      if (updated > (byCategory.get(cat) ?? '')) byCategory.set(cat, updated);
      if (updated > newest) newest = updated;
    }
  }

  // Category index pages reflect the newest entry they list.
  for (const [cat, updated] of byCategory) {
    urls.set(`${SITE}/spec/${cat}/`, updated);
  }
  // Surfaces derived from the whole collection track the newest entry overall.
  if (newest) {
    for (const path of ['/', '/spec/', '/checklist/']) {
      urls.set(`${SITE}${path}`, newest);
    }
  }

  return urls;
}

const lastmodByUrl = buildLastmodMap();

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [
    mdx(),
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      serialize(item) {
        const lastmod = lastmodByUrl.get(item.url);
        if (lastmod) item.lastmod = new Date(`${lastmod}T00:00:00Z`).toISOString();
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 31337,
    host: true,
  },
  markdown: {
    shikiConfig: {
      theme: 'github-light-default',
      wrap: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
