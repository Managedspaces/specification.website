# Adopting Agentic Resource Discovery (ARD) on specification.website

Notes for a joost.blog post. Captures exactly what we changed to become an early
reference implementation of [Agentic Resource Discovery](https://agenticresourcediscovery.org/)
(ARD) — the Linux Foundation / Google draft announced June 2026. Not part of the
deployed site; this file is scratch for the write-up.

## The one-sentence pitch

ARD is a discovery layer (not a runtime): a domain publishes an **AI Catalog** at
`/.well-known/ai-catalog.json` listing the agent capabilities it offers, so
registries and agents can find and trust them in a single fetch. It builds on the
**AI Catalog** standard. Both are Apache 2.0.

We were an unusually clean adopter because the two artefact types an ARD entry
references — an **MCP server card** and an **A2A agent card** — already existed on
the site. Adopting ARD was mostly _cataloguing things we already shipped_, plus a
new spec page (the site documents what it ships).

## What we shipped (every change, in order)

### 1. The catalog itself — `public/.well-known/ai-catalog.json` (new)

The manifest. `specVersion`, a `host` block with an HTTPS `trustManifest`
(identity = `specification.website`), and two `entries`:

| Entry      | `mediaType`                        | `url`                               |
| ---------- | ---------------------------------- | ----------------------------------- |
| MCP server | `application/mcp-server-card+json` | `/.well-known/mcp/server-card.json` |
| A2A agent  | `application/a2a-agent-card+json`  | `/.well-known/agent-card.json`      |

Each entry has a URN `identifier` (`urn:ai:specification.website:mcp:…`), a
`displayName`, `description`, `tags`, `version`, `updatedAt`. We reference the
existing cards by `url` rather than duplicating them — single source of truth.

Honesty note for the post: we deliberately left the `trustManifest` minimal
(HTTPS identity only, no attestations or JWS). We don't have a SPIFFE/DID
identity to attest, and faking attestations would be the exact dishonesty the
spec's trust model exists to prevent.

### 2. Content-Type + Link header — `public/_headers`

- Added a `Content-Type: application/ai-catalog+json` block for the new file
  (with `Access-Control-Allow-Origin: *`, like our other discovery files).
- Added `</.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/ai-catalog+json"`
  to the site-wide `Link` header, alongside the existing mcp / agent-card /
  agent-skills / api-catalog rels.

### 3. HTML `<link rel="ai-catalog">` — `src/components/HeadMeta.astro`

ARD lets publishers advertise the catalog with `<link rel="ai-catalog">` in
`<head>`. Added it site-wide. (We already serve the same rel as an HTTP header;
belt and braces, and it matches how we expose other discovery surfaces.)

### 4. `robots.txt` `Agentmap:` directive — `public/robots.txt`

ARD defines an `Agentmap:` directive (mirroring `Sitemap:`) pointing at the
catalog. Added:

```
Agentmap: https://specification.website/.well-known/ai-catalog.json
```

### 5. DNS service-binding records (manual — see below)

ARD reuses the `_agents` DNS namespace that DNS-AID already uses. We need
`_catalog._agents` (static manifest) and `_search._agents` (dynamic registry
search — we don't run one, so we may skip `_search`).

### 6. api-catalog Linkset — `public/.well-known/api-catalog`

Added the catalog to the homepage anchor's `service-meta` array so the RFC 9727
Linkset and ARD agree on what we publish.

### 7. The spec page — `src/content/spec/agent-readiness/agentic-resource-discovery.md` (new)

Status **`optional`** — it's a v0.9 vendor-led draft, so `optional` is the honest
bar, not `recommended`. Canonical section structure, primary sources led by the
spec/standard (Google blog cited as context only). Added the new slug to
`relatedSlugs` on dns-aid, mcp-and-tool-discovery, a2a-agent-cards, and the
agent-readiness overview.

### 8. Plumbing that travels with any new page

- Changelog: `src/content/changelog/2026-06-19-agentic-resource-discovery.md`.
- OG images: `npm run assets` regenerated the new per-page image plus the four
  count-driven ones (og-default, checklist, spec, agent-readiness category).
- Agent Skill: bumped the page count in `SKILL.md` and recomputed its sha256
  `digest` in `agent-skills/index.json`.
- MCP worker: needs a redeploy (`cd mcp && npm run deploy`) so the bundled
  `data.json` includes the new page.

## The interesting angles for the post

- **We had the pieces already.** ARD didn't ask us to build new capabilities — it
  asked us to _index_ the MCP + A2A endpoints we already ran. That's the whole
  thesis: ARD is a catalogue over existing primitives, not a new runtime.
- **ARD overlaps DNS-AID.** Both use `_<service>._agents.<domain>`. ARD's
  `_catalog._agents` slots straight into the namespace DNS-AID already defined —
  worth a paragraph on the agentic-web discovery stack converging on `_agents`.
- **Status discipline.** Shipping the implementation but rating the spec page
  `optional` is the site's house rule: be an early adopter, stay honest about
  maturity.
- **Trust we didn't fake.** The `trustManifest` is the most ambitious part of
  ARD and the part we engaged with least, on purpose — good honesty beat.

## Schema gotchas worth flagging

- The entry field is `mediaType`, not `type`.
- MCP media type is `application/mcp-server-card+json` (note `-card`), not
  `application/mcp-server+json`.
- Exactly one of `url` or `data` per entry.
- The URN publisher segment must align with the `trustManifest` identity domain.
