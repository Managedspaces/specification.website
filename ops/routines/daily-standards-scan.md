# Daily standards scan — routine instructions

> **This file is the single source of truth for the daily standards-scan routine.**
> A scheduled agent reads this file each run and follows it exactly. Edit this file to
> change what the routine does — do not edit the routine's prompt. Commit and push to
> `main`; the next run picks up the change automatically.

You maintain **specification.website** — a platform-agnostic spec of what a good website
does, generated entirely from Markdown under `src/content/spec/<category>/<slug>.md`.
Read `CLAUDE.md` and `CONTRIBUTING.md` first; they are binding (status discipline,
cardinal content rules, the "ship it before you spec it" rule, the add-a-page workflow,
the SKILL.md digest step).

## Goal

Once daily, scan the standards bodies this spec is built on for material we don't yet
cover or that has changed, then **(a)** open draft PRs for the solid, standards-backed
cases and **(b)** send one Slack summary of everything found.

## Sources to check (cited bodies + adjacent feeds)

- WHATWG HTML / DOM / Fetch living standards (`html.spec.whatwg.org` and siblings)
- W3C TR index + CSSWG drafts (`drafts.csswg.org`) for new/advanced specs
- WCAG / W3C accessibility (new success criteria, WCAG 2.2/3.0 movement)
- IETF: new or updated RFCs and active drafts in the web/security/well-known space
  (`rfc-editor.org`, `datatracker.ietf.org`)
- IANA registries: Well-Known URIs, Link Relations, message headers (new registrations)
- schema.org releases (new/changed types relevant to sites)
- Agent-protocol sources: `llmstxt.org`, `modelcontextprotocol.io`, `a2a-protocol.org`
- `sitemaps.org`, JSON Feed, RSS board
- Adjacent (watch, don't blindly trust): `web.dev` — especially <https://web.dev/blog> —
  `developer.chrome.com`, Google Search Central — for emerging conventions worth
  promoting LATER

## Three things to look for

1. **New topics** — a standard/convention/well-known URI we have no page for.
2. **Status changes** — something we cover that advanced (CR→REC), was obsoleted,
   deprecated, or whose `recommended`/`required`/`avoid` status should now move. Cite the
   change.
3. **Dead or stale citations** — sources on existing pages that 404, moved, or no longer
   say what the page claims. Spot-check a **rotating slice** each run, not every page
   every day.

## Scope & status rules (do not violate)

- Platform-agnostic only: describe outcomes and standards, never "add this to
  `next.config`".
- Status bar: `required` only if the web platform contract breaks without it; otherwise
  `recommended`/`optional`; `avoid` for outdated/harmful. Default to `recommended`.
- Primary sources only (WHATWG / W3C / IETF / IANA / WCAG / schema.org first; MDN /
  web.dev for context).
- **Ship it before you spec it**: a brand-new *convention* that would require the site to
  implement a new capability does NOT get a PR — flag it in Slack as "needs us to ship X
  first" so the maintainer can decide. PRs are only for documenting standards we can
  honestly describe (and, where applicable, that the site already satisfies).

## Dedup (critical for a daily job)

Before proposing anything: `git fetch`, list open PRs/branches, and check for an existing
page. Never open a second PR for a topic already proposed or covered. If nothing new and
nothing stale, say so in Slack and open no PRs.

## For each solid candidate → draft PR

- Branch off `main`. Follow the CLAUDE.md add/change workflow exactly:
  - **New page:** full frontmatter (`title`, `slug`, `category`, `summary`, `status`,
    `order`, `appliesTo`, `relatedSlugs`, `sources` [2–4], `updated`) + the canonical
    sections (`## What it is` / `## Why it matters` / `## How to implement` /
    `## Common mistakes` / `## Verification`), British English, 250–500 words.
  - Wire `relatedSlugs` on adjacent pages; if it adds a discoverable resource, update the
    api-catalog Linkset and the `Link` header per CLAUDE.md.
  - If page count or categories change, update
    `public/.well-known/agent-skills/specification-website/SKILL.md` **and** recompute its
    sha256 into `agent-skills/index.json`.
- Run `npm run build` (must pass) before opening the PR.
- Open it as a **DRAFT**, never merge. PR body: what changed, why now, the primary
  source(s), the chosen status with one-line justification. One PR per topic. Do **not**
  redeploy the MCP Worker — that's a human step after merge.

## Slack summary (always, even on a quiet day)

DM the maintainer with:

- New topics found → PR links (or "flagged, needs implementation decision").
- Status changes → page + what moved + source + PR link.
- Stale/dead citations → page + broken source + fix PR link.
- Anything deliberately skipped, and why.

Keep it scannable: grouped, one line each, links inline.
