---
title: "Open Knowledge Format (OKF) bundle"
slug: okf-bundle
category: agent-readiness
summary: "Publish your whole knowledge base as an Open Knowledge Format bundle — a tree of Markdown concept files with typed front matter — so an agent can ingest the entire corpus in one fetch instead of scraping page by page."
status: optional
order: 89
appliesTo: [all]
relatedSlugs: [agentic-resource-discovery, markdown-source-endpoints, machine-readable-formats, llms-full-txt, structured-data-for-agents]
updated: "2026-06-19T00:00:00.000Z"
sources:
  - title: "Open Knowledge Format (OKF) specification"
    url: "https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md"
    publisher: "Google"
  - title: "Open Knowledge Format — reference implementation and samples"
    url: "https://github.com/GoogleCloudPlatform/knowledge-catalog/tree/main/okf"
    publisher: "Google"
  - title: "Agentic Resource Discovery (ARD) specification"
    url: "https://agenticresourcediscovery.org/"
    publisher: "ARD Project (Linux Foundation)"
---

## What it is

The Open Knowledge Format (OKF) is a convention for packaging a body of knowledge as a tree of Markdown files an agent can consume directly. Each file is a **concept**: a YAML front-matter block followed by Markdown prose. The only hard requirement is a non-empty `type` field; the format leans on a small set of recommended fields (`title`, `description`, `resource`, `tags`, `timestamp`) and lets producers add their own keys, which consumers must preserve rather than reject.

A bundle is otherwise plain files and folders. `index.md` files give progressive disclosure — a reader can list a directory without parsing every concept. A root `log.md` records change history newest-first. A `references/` directory mirrors external standards as first-class concepts so a check can cite them with a bundle-relative link. There is no manifest, no schema server, and no runtime: a bundle is the directory itself.

## Why it matters

- **One ingest, not N scrapes.** An agent that wants your whole corpus gets it in a single download instead of crawling every HTML page and stripping navigation.
- **Typed, predictable structure.** Every concept declares what it is. Front matter carries the metadata an agent would otherwise have to infer.
- **Graceful for consumers.** Conformance is deliberately loose — unknown types, extra keys, and missing optional fields must not cause rejection — so a bundle stays usable as it grows.

OKF deliberately leaves **serving and discovery out of scope**. A bundle on its own is undiscoverable; pair it with a discovery surface — an [AI Catalog entry](/spec/agent-readiness/agentic-resource-discovery/) and an [`llms.txt`](/spec/agent-readiness/llms-txt/) pointer — so agents can find it.

## How to implement

Generate the bundle from your existing source of truth; do not hand-maintain a second copy. For each item, emit `<path>.md` with a `type` and the recommended fields, reusing the same Markdown body you already serve. Emit an `index.md` per directory (no front matter, except the bundle root, which may carry `okf_version`). Add a `log.md` from your change history. Mirror each cited standard once under `references/` and link checks to it. Offer the tree browsably and, optionally, as a single archive for "take everything" consumers. Then advertise it.

This site ships it: the bundle is generated from the same content collection as every other surface and served browsable at [`/okf/`](/okf/index.md), with the whole tree packaged as [`/okf.tar.gz`](/okf.tar.gz). Each check carries its `status` as an RFC 2119 `conformance` keyword and links to the standard it derives from; every cited source is mirrored under [`/okf/references/`](/okf/references/index.md). The bundle is advertised in our [AI Catalog](/spec/agent-readiness/agentic-resource-discovery/) and in [`/llms.txt`](/llms.txt). Its `mediaType` is interim and unregistered (`application/okf-bundle+gzip`) pending a blessed OKF media type.

## Common mistakes

- Hand-authoring the bundle so it drifts from the source. Generate it.
- Putting front matter in `index.md` files — only the bundle-root `index.md` may carry it.
- Shipping the bundle with no way to find it. OKF solves packaging, not discovery; advertise it separately.
- Claiming a registered media type the artefact does not have. Until OKF has one, declare an honest interim type.

## Verification

- Every non-index, non-log `.md` parses as YAML front matter with a non-empty `type`.
- `index.md` files carry no front matter (except the root's `okf_version`).
- Concept count matches your source corpus; the tree round-trips cleanly from the archive.
- The bundle is reachable from at least one discovery surface (AI Catalog entry, `llms.txt`, or a `Link` header).
