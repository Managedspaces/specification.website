import { getCollection } from 'astro:content';
import { site } from '~/lib/site';

export type SitemapEntry = { loc: string; lastmod?: string };

export const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const isoFromDate = (d: string) => new Date(`${d}T00:00:00Z`).toISOString();

export function renderUrlset(entries: SitemapEntry[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const e of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${xmlEscape(e.loc)}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${isoFromDate(e.lastmod)}</lastmod>`);
    lines.push('  </url>');
  }
  lines.push('</urlset>');
  return lines.join('\n');
}

export function renderSitemapIndex(entries: SitemapEntry[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const e of entries) {
    lines.push('  <sitemap>');
    lines.push(`    <loc>${xmlEscape(e.loc)}</loc>`);
    if (e.lastmod) lines.push(`    <lastmod>${isoFromDate(e.lastmod)}</lastmod>`);
    lines.push('  </sitemap>');
  }
  lines.push('</sitemapindex>');
  return lines.join('\n');
}

export const xmlResponse = (body: string) =>
  new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });

export type SpecLastmod = {
  /** URL → newest `updated` date for that URL (YYYY-MM-DD). */
  perUrl: Map<string, string>;
  /** Category slug → newest `updated` date across its entries. */
  perCategory: Map<string, string>;
  /** Newest `updated` date across every published entry. */
  newest: string;
};

export async function loadSpecLastmod(): Promise<SpecLastmod> {
  const entries = await getCollection('spec', ({ data }) => !data.draft);
  const perUrl = new Map<string, string>();
  const perCategory = new Map<string, string>();
  let newest = '';

  for (const e of entries) {
    const updated = e.data.updated;
    if (!updated) continue;
    const slug = e.data.slug ?? e.id.split('/').pop()!;
    const url = `${site.url}/spec/${e.data.category}/${slug}/`;
    perUrl.set(url, updated);
    if (updated > (perCategory.get(e.data.category) ?? '')) {
      perCategory.set(e.data.category, updated);
    }
    if (updated > newest) newest = updated;
  }

  return { perUrl, perCategory, newest };
}
