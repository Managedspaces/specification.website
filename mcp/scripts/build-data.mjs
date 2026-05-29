// Build-time: read every spec markdown file from the parent project and
// emit a single JSON manifest the Worker bundles directly. No runtime
// markdown parsing, no cold-start fetches.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = fileURLToPath(new URL('.', import.meta.url));
const specRoot = join(here, '..', '..', 'src', 'content', 'spec');
const out = join(here, '..', 'src', 'data.json');
const siteRoot = 'https://specification.website';

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) yield path;
  }
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('missing frontmatter');
  return { data: parseYaml(m[1]), body: m[2].trim() };
}

const pages = [];
for await (const file of walk(specRoot)) {
  const text = await readFile(file, 'utf8');
  const { data, body } = parseFrontmatter(text);
  const rel = relative(specRoot, file).replace(/\\/g, '/');
  const category = data.category ?? rel.split('/')[0];
  const slug = data.slug ?? rel.split('/').pop().replace(/\.md$/, '');
  pages.push({
    slug,
    category,
    title: data.title,
    summary: data.summary,
    status: data.status,
    order: data.order ?? 100,
    appliesTo: data.appliesTo ?? ['all'],
    relatedSlugs: data.relatedSlugs ?? [],
    sources: data.sources ?? [],
    updated: data.updated ?? null,
    url: `${siteRoot}/spec/${category}/${slug}/`,
    mdUrl: `${siteRoot}/spec/${category}/${slug}.md`,
    body,
  });
}

pages.sort((a, b) =>
  a.category.localeCompare(b.category) ||
  a.order - b.order ||
  a.title.localeCompare(b.title),
);

const categories = [
  { slug: 'foundations', title: 'Foundations', summary: 'HTML, head, document basics.', order: 1 },
  { slug: 'seo', title: 'SEO', summary: 'Search visibility.', order: 2 },
  { slug: 'accessibility', title: 'Accessibility', summary: 'WCAG-aligned rules.', order: 3 },
  { slug: 'security', title: 'Security', summary: 'Headers, transport, policies.', order: 4 },
  { slug: 'well-known', title: 'Well-Known URIs', summary: 'Standard /.well-known/ paths.', order: 5 },
  { slug: 'agent-readiness', title: 'Agent Readiness', summary: 'Discoverability by AI agents.', order: 6 },
  { slug: 'performance', title: 'Performance', summary: 'Core Web Vitals, caching, fonts.', order: 7 },
  { slug: 'privacy', title: 'Privacy', summary: 'Consent and visitor choice.', order: 8 },
  { slug: 'resilience', title: 'Resilience', summary: 'Graceful failure.', order: 9 },
  { slug: 'i18n', title: 'Internationalisation', summary: 'Language, locale, direction.', order: 10 },
];

const manifest = {
  generatedAt: new Date(0).toISOString().replace('1970', '2026-05'), // build-time stamp set below
  site: siteRoot,
  categories,
  pages,
};

// Stamp with a deterministic build time on disk only.
manifest.generatedAt = process.env.SOURCE_DATE_EPOCH
  ? new Date(parseInt(process.env.SOURCE_DATE_EPOCH, 10) * 1000).toISOString()
  : new Date().toISOString();

await writeFile(out, JSON.stringify(manifest, null, 2));
console.log(`✓ wrote ${relative(here, out)} — ${pages.length} pages across ${categories.length} categories`);
