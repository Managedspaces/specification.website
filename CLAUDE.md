# CLAUDE.md — repo guidance for AI agents (and humans skimming)

This file is read by Claude Code (and any other agent that respects the convention) before it works on this repo. Keep it short, accurate, and updated alongside the code it describes.

## What this project is

`specification.website` — a platform-agnostic specification of what a good website does. Static Astro site, deployed to Cloudflare Pages from this repository's `main` branch. MIT licensed (code) / CC BY 4.0 (content).

Live: <https://specification.website> and <https://specification-website.pages.dev>.

## Top-level rule: everything is derived from the content collection

The whole site is generated from one source of truth: Markdown files under `src/content/spec/<category>/<slug>.md`, with the schema in `src/content.config.ts` and the category list in `src/lib/site.ts`.

**When you add, remove, or change a spec page, the following surfaces update automatically on the next build. Do not hand-edit any of them:**

- `/checklist/` — every spec entry, grouped by category, tickable. Built by `src/pages/checklist.astro` from `getCollection('spec')`.
- `/spec/` (index) and `/spec/<category>/` (category indexes). Same source.
- `/spec/<category>/<slug>/` — the HTML page. Built by `src/pages/spec/[category]/[slug].astro`.
- `/spec/<category>/<slug>.md` — the raw Markdown endpoint with YAML frontmatter. Built by `src/pages/spec/[category]/[slug].md.ts`.
- `/llms.txt` and `/llms-full.txt` — the agent-facing indexes. Built by `src/pages/llms.txt.ts` and `src/pages/llms-full.txt.ts`.
- `/sitemap-index.xml` — built by `@astrojs/sitemap`.
- `/rss.xml` — built by `src/pages/rss.xml.ts`.
- The Pagefind search index — built by `pagefind --site dist` in the `build` script. Powers the `/search/` page and the global ⌘K overlay.

**If you find yourself editing the checklist by hand, you are doing it wrong.** Edit the spec entry's front matter (`status`, `summary`, `title`) and rebuild.

## Status discipline

The status field is the user-facing contract. Use it precisely.

- **`required`** — the web platform contract breaks, or a clear class of users is harmed, without it. Examples: `<title>`, `<meta charset>`, HTTPS, image alt text, custom 404 returning 404.
- **`recommended`** — a modern site should do it. Examples: CSP, HSTS, structured data, Open Graph, security.txt, /llms.txt.
- **`optional`** — depends on context. Examples: image sitemaps, OpenID Configuration, IDN support.
- **`avoid`** — outdated, harmful, or superseded by a working alternative. Examples: soft-404, empty links/buttons.

When in doubt, default to `recommended`, not `required`. The bar for `required` is "the platform breaks without it", not "we strongly suggest it".

## Cardinal rules for content

These mirror `CONTRIBUTING.md`. Enforce them in your own writing and when reviewing.

1. **Cite primary sources.** Every spec page needs 2–4 sources in front matter, weighted toward standards bodies: WHATWG, W3C, IETF RFCs, IANA, WCAG, schema.org, sitemaps.org, llmstxt.org. Then MDN / web.dev / Google Search Central for practical context. Avoid blog posts and vendor marketing.
2. **Stay platform-agnostic.** Describe outcomes, not implementations. "Set `Content-Security-Policy`" is in scope. "Add this to your `next.config.mjs`" is not. Link out to platform docs instead.
3. **Be honest about status.** If something is shipping as `required` but the platform works without it, downgrade to `recommended`. If the source URL is dead, replace it (Wayback Machine is acceptable) or remove the citation.
4. **British English.** "colour", "behaviour", "internationalisation", "licence" (noun).
5. **Section structure.** `## What it is`, `## Why it matters`, `## How to implement`, `## Common mistakes`, `## Verification`. Last two are optional if they would not add value.
6. **Length.** 250–500 words of body content. Be useful, not padded.

## Architecture quick reference

| Path | Purpose |
|---|---|
| `src/content/spec/<cat>/<slug>.md` | Spec content. Edit here. |
| `src/content.config.ts` | Content collection schema. Edit if adding a field. |
| `src/lib/site.ts` | Site metadata + the canonical category list. |
| `src/layouts/BaseLayout.astro` | HTML shell, head, dialog for ⌘K search, Plausible (PROD only). |
| `src/layouts/SpecLayout.astro` | Spec page wrapper; emits TechArticle + BreadcrumbList JSON-LD; advertises Markdown alt via `markdownUrl`. |
| `src/components/HeadMeta.astro` | `<head>` metadata, canonical, OG, Twitter, JSON-LD, RSS / sitemap / markdown alternates. |
| `src/components/SiteHeader.astro` | Header nav. Contains the ⌘K trigger. |
| `src/components/SiteFooter.astro` | Footer. Privacy / search links live here. |
| `src/pages/spec/[category]/[slug].astro` | The dynamic HTML route. |
| `src/pages/spec/[category]/[slug].md.ts` | The dynamic Markdown route. |
| `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`, `src/pages/rss.xml.ts` | Derived endpoints. |
| `functions/_middleware.ts` | Cloudflare Pages middleware. Does `Accept: text/markdown` content negotiation on canonical spec URLs and on `/`. |
| `public/_headers` | Cloudflare response headers — strict CSP, HSTS, Permissions-Policy, Vary on .md, content types for well-known files, the discovery `Link` header. |
| `public/.well-known/` | Static well-known URIs (security.txt, change-password, api-catalog, mcp/server-card.json, agent-card.json for A2A discovery, agent-skills/index.json + agent-skills/<name>/SKILL.md per the Agent Skills Discovery RFC v0.2.0 — if you edit a SKILL.md, recompute its sha256 and update the `digest` in index.json). |
| `mcp/` | Cloudflare Worker exposing the spec at `mcp.specification.website`. Serves the MCP transport at `/mcp`, an A2A (Agent-to-Agent) JSON-RPC endpoint at `/a2a/v1`, and mirrors both discovery cards under `/.well-known/`. Has its own `package.json`, `wrangler.toml`, build script. Reads from the same `src/content/spec/` source of truth at build time. |
| `public/search-overlay.js` | ⌘K overlay logic. CSP-safe (no inline JS). |
| `public/search-init.js` | `/search/` page Pagefind initialiser. CSP-safe. |
| `scripts/generate-assets.mjs` | Generates icons + OG image from inline SVGs via `sharp`. Wired through `prebuild`/`predev`. |

## Commands

```
npm run dev      # http://localhost:31337
npm run build    # astro build && pagefind --site dist
npm run preview  # serve dist on 31337
npm run check    # astro check
npm run assets   # regenerate icons + OG image
```

`predev` and `prebuild` run `scripts/generate-assets.mjs` automatically.

## Workflow when adding or changing a spec page

1. Copy an existing entry in `src/content/spec/<category>/`.
2. Update the front matter: `title`, `slug`, `summary`, `status`, `order`, `relatedSlugs`, `sources`, `updated`.
3. Write the body using the canonical section structure.
4. Run `npm run dev` and open the page on port 31337.
5. Verify: it appears on `/spec/`, on `/spec/<category>/`, on `/checklist/`, in `/llms.txt`, in `/sitemap-index.xml`, and is served at `.md` with frontmatter.
6. Commit. Push to `main`. Cloudflare Pages auto-deploys.

**Do not** also edit `/checklist/`, `/llms.txt`, or any other derived surface. They will rebuild.

## When the site itself gains a capability, ship the spec page too

The site is a *worked example* of the spec, not just documentation that lives next to it. Divergence between what we ship and what we recommend is a bug. Whenever you implement a new capability on the site that fits a spec topic, the same PR has to make the spec match.

Trigger this rule when you ship any of:

- a new HTTP response header (CSP directive, `Link` rel, `Vary`, custom security header);
- a new `/.well-known/` file (`security.txt`, `api-catalog`, `mcp/server-card.json`, `agent-skills/...`);
- a new agent-discovery surface (MCP server, agent skills, DNS-AID records, server card, Linkset entry);
- a new content endpoint (`.md` mirror, JSON API, RSS, JSON Feed, alternate format);
- a new accessibility, performance, privacy, SEO, or i18n behaviour worth recommending elsewhere.

The same PR must do **one** of:

1. **Add a new spec page** under `src/content/spec/<category>/` documenting the underlying standard or convention. Cite primary sources (IETF, W3C, WHATWG, MDN — see [Cardinal rules](#cardinal-rules-for-content)). Pick a status honestly: `required` only if the platform contract breaks without it, otherwise `recommended` or `optional`. Add a one-line "this site ships it; see [X]" callout pointing at our implementation or asset.
2. **Update an existing spec page** to incorporate the new convention, add the new sources, or add the worked-example callout. Bump `updated`. Add the new page (or new section) to `relatedSlugs` on adjacent topics so the cross-graph stays correct.

Also update the [api-catalog Linkset](public/.well-known/api-catalog) if the capability adds a discoverable resource, and the global `Link` header in [`public/_headers`](public/_headers) if it has a registered IANA `rel`. Both should match what the new spec page describes.

The reverse holds too: **do not promote a convention to spec status without us shipping a working implementation first.** The site is the proof-of-feasibility. If the underlying convention turns out non-existent or defunct (see the `/.well-known/ai.txt` deletion history), remove the asset *and* the spec page in the same PR — don't leave the page documenting something we no longer ship.

## When changing a status

1. Edit the `status` field on the spec entry.
2. Rebuild — the badge changes on the spec page, the category page, the checklist, and the llms.txt summary all at once.
3. If you are *downgrading* or removing something because the underlying convention turned out non-existent or defunct (the spec's job is to be honest about this — see the deleted `/.well-known/ai.txt` history), also delete any matching asset under `public/`, any cross-references in other spec pages' `relatedSlugs`, and update `CLAUDE.md` if the change is structural.

## Things this site does that you should not break

- **No cookies.** Plausible is the only analytics. It is cookieless and only loaded in `import.meta.env.PROD`. Don't add anything that sets cookies.
- **No third-party scripts other than Plausible.** Anything new requires a CSP update in `public/_headers` and a privacy-policy update in `src/pages/privacy.astro`.
- **No inline `<script>` content** without a corresponding CSP allowance. The site relies on a strict CSP with no `'unsafe-inline'` on `script-src`. Put init logic in a file under `public/` and reference it.
- **Content-Type discipline on well-known files and `/spec/*.md`.** Maintained in `public/_headers`.
- **The `Vary: Accept` header on spec pages.** Set by `functions/_middleware.ts`. Removing it breaks downstream caches serving HTML when an agent asks for Markdown.

## Deployment

- `main` → Cloudflare Pages, auto-deployed via the Pages dashboard's Git integration. No GitHub Actions deploy workflow (`ci.yml` only runs type-check + build verification).
- Custom domain for the site: `specification.website` (configure in the Cloudflare Pages dashboard).
- Functions live in `/functions/` and ship alongside static assets. The Cloudflare build picks them up automatically.
- The **MCP server** in `/mcp/` is a separate Cloudflare Worker — `cd mcp && npm run deploy`. It registers `mcp.specification.website` as a custom domain on first deploy. When the spec content changes, redeploy the Worker so its bundled data stays in sync (the predeploy hook regenerates `mcp/src/data.json`).

## Privacy stance

The site collects aggregate Plausible analytics (no cookies, no IP storage, EU-hosted) and nothing else. Documented in `src/pages/privacy.astro`. If you add anything that collects data, update that page truthfully *in the same PR*.
