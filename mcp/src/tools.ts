import type { Category, Page, Manifest, Status } from './types';

// --- helpers ------------------------------------------------------------

function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s/_.-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

interface Scored {
  page: Page;
  score: number;
  matches: { field: string; snippet: string }[];
}

function snippet(body: string, query: string, radius = 80): string {
  const lower = body.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return '';
  const start = Math.max(0, idx - radius);
  const end = Math.min(body.length, idx + q.length + radius);
  const pre = start > 0 ? '…' : '';
  const post = end < body.length ? '…' : '';
  return (pre + body.slice(start, end) + post).replace(/\s+/g, ' ').trim();
}

function rankPages(pages: Page[], rawQuery: string, limit: number): Scored[] {
  const tokens = tokenise(rawQuery);
  if (tokens.length === 0) return [];
  const scored: Scored[] = [];
  for (const page of pages) {
    const fields = {
      title: page.title.toLowerCase(),
      slug: page.slug.toLowerCase(),
      summary: page.summary.toLowerCase(),
      body: page.body.toLowerCase(),
    };
    let score = 0;
    const matches: { field: string; snippet: string }[] = [];
    for (const t of tokens) {
      if (fields.title.includes(t)) score += 8;
      if (fields.slug.includes(t)) score += 6;
      if (fields.summary.includes(t)) score += 4;
      const bodyHits = fields.body.split(t).length - 1;
      if (bodyHits > 0) {
        score += Math.min(bodyHits, 6);
        const s = snippet(page.body, t);
        if (s && matches.length < 2) matches.push({ field: 'body', snippet: s });
      }
    }
    // Phrase bonus
    if (fields.title.includes(rawQuery.toLowerCase())) score += 12;
    if (score > 0) scored.push({ page, score, matches });
  }
  scored.sort((a, b) => b.score - a.score || a.page.order - b.page.order);
  return scored.slice(0, limit);
}

function filterPages(
  pages: Page[],
  filters: { category?: string; status?: Status },
): Page[] {
  return pages.filter((p) => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.status && p.status !== filters.status) return false;
    return true;
  });
}

// --- tool implementations -----------------------------------------------

export function searchTool(m: Manifest, args: { query: string; limit?: number }) {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 25);
  const results = rankPages(m.pages, args.query, limit);
  if (results.length === 0) {
    return {
      content: [{ type: 'text' as const, text: `No spec pages matched "${args.query}".` }],
    };
  }
  const lines: string[] = [];
  lines.push(`Found ${results.length} spec page${results.length === 1 ? '' : 's'} for "${args.query}":\n`);
  for (const { page, score, matches } of results) {
    lines.push(`### ${page.title}`);
    lines.push(`- **status:** ${page.status}  ·  **category:** ${page.category}  ·  **score:** ${score}`);
    lines.push(`- **url:** ${page.url}`);
    lines.push(`- **markdown:** ${page.mdUrl}`);
    lines.push(`- ${page.summary}`);
    for (const m of matches) lines.push(`  > …${m.snippet}…`);
    lines.push('');
  }
  return { content: [{ type: 'text' as const, text: lines.join('\n').trimEnd() }] };
}

export function listTopicsTool(
  m: Manifest,
  args: { category?: string; status?: Status; limit?: number },
) {
  const pages = filterPages(m.pages, args);
  const limit = args.limit ? Math.min(Math.max(args.limit, 1), 200) : pages.length;
  const items = pages.slice(0, limit);
  const lines: string[] = [];
  const filterDesc =
    [
      args.category ? `category=${args.category}` : '',
      args.status ? `status=${args.status}` : '',
    ]
      .filter(Boolean)
      .join(', ') || 'all';
  lines.push(
    `${items.length} of ${pages.length} matching topics (filters: ${filterDesc}):\n`,
  );
  for (const p of items) {
    lines.push(`- **[${p.title}](${p.url})** — ${p.status}, ${p.category}`);
    lines.push(`  ${p.summary}`);
  }
  return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
}

export function getTopicTool(m: Manifest, args: { slug: string }) {
  const page =
    m.pages.find((p) => p.slug === args.slug) ??
    m.pages.find((p) => p.slug.toLowerCase() === args.slug.toLowerCase());
  if (!page) {
    const close = m.pages
      .map((p) => ({ p, score: p.slug.includes(args.slug) || args.slug.includes(p.slug) ? 1 : 0 }))
      .filter((x) => x.score > 0)
      .slice(0, 5);
    const suggestions = close.length
      ? `\nCloser matches: ${close.map((x) => x.p.slug).join(', ')}`
      : '';
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `No spec page with slug "${args.slug}".${suggestions}`,
        },
      ],
    };
  }
  const fm: string[] = [
    '---',
    `title: ${JSON.stringify(page.title)}`,
    `slug: ${page.slug}`,
    `category: ${page.category}`,
    `status: ${page.status}`,
    `url: ${page.url}`,
    `markdown: ${page.mdUrl}`,
  ];
  if (page.updated) fm.push(`updated: ${JSON.stringify(page.updated)}`);
  if (page.sources.length) {
    fm.push('sources:');
    for (const s of page.sources) {
      fm.push(`  - title: ${JSON.stringify(s.title)}`);
      fm.push(`    url: ${JSON.stringify(s.url)}`);
      if (s.publisher) fm.push(`    publisher: ${JSON.stringify(s.publisher)}`);
    }
  }
  if (page.relatedSlugs.length) {
    fm.push(`relatedSlugs: [${page.relatedSlugs.join(', ')}]`);
  }
  fm.push('---', '');
  const text = `${fm.join('\n')}# ${page.title}\n\n> ${page.summary}\n\n${page.body}`;
  return { content: [{ type: 'text' as const, text }] };
}

export function getChecklistTool(
  m: Manifest,
  args: { category?: string; status?: Status },
) {
  const pages = filterPages(m.pages, args);
  if (pages.length === 0) {
    return { content: [{ type: 'text' as const, text: 'No matching items.' }] };
  }
  // group by category
  const groups = new Map<string, Page[]>();
  for (const p of pages) {
    const k = p.category;
    const arr = groups.get(k) ?? [];
    arr.push(p);
    groups.set(k, arr);
  }
  const lines: string[] = [];
  lines.push(`# The Website Specification — checklist (${pages.length} items)\n`);
  const cats = Array.from(groups.keys()).sort((a, b) => {
    const oa = m.categories.find((c) => c.slug === a)?.order ?? 99;
    const ob = m.categories.find((c) => c.slug === b)?.order ?? 99;
    return oa - ob;
  });
  for (const c of cats) {
    const cat = m.categories.find((x) => x.slug === c);
    lines.push(`## ${cat?.title ?? c}`);
    for (const p of groups.get(c)!) {
      lines.push(`- [ ] **${p.title}** _(${p.status})_ — ${p.summary}`);
      lines.push(`      ${p.url}`);
    }
    lines.push('');
  }
  return { content: [{ type: 'text' as const, text: lines.join('\n').trimEnd() }] };
}

export function getCategoriesTool(m: Manifest) {
  const counts = new Map<string, number>();
  for (const p of m.pages) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  const lines: string[] = [];
  lines.push(`# Categories (${m.categories.length})\n`);
  for (const c of m.categories) {
    lines.push(`- **${c.title}** (\`${c.slug}\`) — ${counts.get(c.slug) ?? 0} topics. ${c.summary}`);
  }
  return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
}

// --- tool catalogue (advertised via tools/list) -------------------------

const CATEGORY_ENUM = [
  'foundations',
  'seo',
  'accessibility',
  'security',
  'well-known',
  'agent-readiness',
  'performance',
  'privacy',
  'resilience',
  'i18n',
];

const STATUS_ENUM = ['required', 'recommended', 'optional', 'avoid'];

export const TOOLS = [
  {
    name: 'search',
    description:
      'Full-text search across every spec page. Returns ranked results with title, status, category, canonical URL, and a body excerpt. Use this when the user asks about a topic by keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text query.' },
        limit: { type: 'integer', minimum: 1, maximum: 25, default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_topics',
    description:
      'List spec topics, optionally filtered by category and/or status. Returns title, status, category, summary, and URL for each. Use this when the user wants the canonical list of e.g. all required SEO topics.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORY_ENUM },
        status: { type: 'string', enum: STATUS_ENUM },
        limit: { type: 'integer', minimum: 1, maximum: 200 },
      },
    },
  },
  {
    name: 'get_topic',
    description:
      'Fetch the full canonical Markdown for a single spec page by its slug. Returns the YAML frontmatter (with title, status, sources) plus the rendered body.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description:
            'Kebab-case slug, as listed by `list_topics` or `search`. Examples: `content-security-policy`, `meta-robots`, `llms-txt`.',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'get_checklist',
    description:
      'Return a Markdown checklist of spec items, grouped by category, optionally filtered by category and/or status. Useful for site audits.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: CATEGORY_ENUM },
        status: { type: 'string', enum: STATUS_ENUM },
      },
    },
  },
  {
    name: 'get_categories',
    description: 'List the ten top-level spec categories with their summaries and topic counts.',
    inputSchema: { type: 'object', properties: {} },
  },
];

export const PROMPTS = [
  {
    name: 'audit_url',
    description:
      'Generate an audit plan for a target URL against this spec. With no `focus`, the plan covers required-tier items only (the platform-contract baseline, ~35 items). Pass `focus` to audit a single category at recommended + optional depth (capped at 40 items).',
    arguments: [
      { name: 'url', description: 'The website URL to audit.', required: true },
      {
        name: 'focus',
        description:
          'Optional category to focus on (foundations, seo, accessibility, security, well-known, agent-readiness, performance, privacy, resilience, i18n). If omitted, the plan defaults to required-tier items across all categories.',
        required: false,
      },
    ],
  },
];

export function buildAuditPrompt(m: Manifest, url: string, focus?: string) {
  const pages = focus
    ? m.pages.filter((p) => p.category === focus && p.status !== 'avoid')
    : m.pages.filter((p) => p.status === 'required');
  const items = pages.slice(0, 40);
  const focusLine = focus
    ? `the **${focus}** category`
    : `every **required** item across the spec`;
  const messages = [
    {
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text:
          `You are auditing the website ${url} against The Website Specification ` +
          `(https://specification.website). Focus on ${focusLine}. ` +
          `For each item below, decide PASS / FAIL / UNCLEAR by fetching the page (and headers) ` +
          `and citing the evidence. Where multiple items overlap, group them. ` +
          `Use the get_topic tool to load any page's full guidance before judging.\n\n` +
          items
            .map((p) => `- **${p.title}** (${p.status}) — ${p.summary}\n  Reference: ${p.url}`)
            .join('\n') +
          `\n\nFor each FAIL, recommend the minimal change with a code snippet where possible.`,
      },
    },
  ];
  return {
    description: `Audit plan for ${url}${focus ? ' (' + focus + ')' : ''}.`,
    messages,
  };
}
