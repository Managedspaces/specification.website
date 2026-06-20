---
title: "HTTP/1.1 workarounds: sharding, sprites, concatenation"
slug: http1-workarounds
category: performance
summary: "Domain sharding, image sprites, and asset concatenation were workarounds for HTTP/1.1's per-origin connection limit. Under HTTP/2 and HTTP/3 they hurt more than they help — drop them."
status: avoid
order: 92
appliesTo: [all]
relatedSlugs: [http3, image-optimization, critical-css, cache-control, lazy-loading]
updated: "2026-06-20T00:00:00.000Z"
sources:
  - title: "RFC 9113 — HTTP/2"
    url: "https://www.rfc-editor.org/rfc/rfc9113"
    publisher: "IETF"
  - title: "MDN — Evolution of HTTP"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Evolution_of_HTTP"
    publisher: "MDN"
  - title: "web.dev — HTTP/2 and you"
    url: "https://web.dev/articles/performance-http2"
    publisher: "web.dev"
---

## What it is

Three classic optimisations were invented to dodge one HTTP/1.1 limitation: a browser opens only about six parallel connections per origin, and each connection carries one request at a time.

- **Domain sharding** — splitting assets across extra hostnames (`cdn1.example.com`, `cdn2.example.com`, `assets.example.com`) so the browser opens more connections in total.
- **Image sprites** — combining many small images into one big sheet and using CSS `background-position` to show slices, turning dozens of requests into one.
- **Concatenation** — bundling many CSS or JS files into one large file, again to cut the request count.

All three trade granularity for fewer requests. That was the right trade under HTTP/1.1. It is the wrong trade under [HTTP/2 and HTTP/3](/spec/performance/http3/), which multiplex unlimited concurrent requests over a single connection.

## Why it matters

Once a connection multiplexes, "fewer, bigger files" stops being free and starts costing you:

- **Caching gets coarse.** One concatenated bundle or sprite sheet busts the whole artefact when one byte changes. Returning visitors re-download everything instead of the one file that actually changed.
- **Prioritisation breaks.** HTTP/2 lets the browser fetch critical resources first. A monolithic bundle is one indivisible stream — the browser cannot prioritise the critical CSS inside it ahead of the rest.
- **Unused bytes ship anyway.** Sprites force every page to download every icon, including ones it never shows; bundles pull in code the current route does not need.
- **Sharding fights the connection.** Extra hostnames mean extra DNS lookups, TLS handshakes, and connections — and they defeat HTTP/2's single-connection coalescing, the very thing that makes it fast. QUIC's connection migration and 0-RTT only help when traffic stays on one origin.

## How to implement

The fix is to stop, not to add anything:

- **Serve assets as their natural separate files** over one origin and let multiplexing do the work.
- **Replace sprites** with individual optimised images, inline SVG, or an icon font where appropriate — and [lazy-load](/spec/performance/lazy-loading/) what is below the fold.
- **Ship granular, route-level CSS and JS** so caching and prioritisation stay fine-grained. Modern bundlers split by route by default; let them.
- **Consolidate onto one hostname** so every request reuses the same connection.

First confirm you are actually on a modern protocol — see [HTTP/2 and HTTP/3](/spec/performance/http3/). If a legacy client base still forces HTTP/1.1, these workarounds may remain a conscious trade-off; for the modern web they are net-negative.

## Common mistakes

- Carrying a sprite sheet or domain-sharding config forward from an old build pipeline without re-checking whether it still helps. It doesn't.
- Concatenating everything into one bundle "to save a request" — under HTTP/2 the request is nearly free and the caching cost is real.
- Confusing this with bundling for fewer *modules* — tree-shaking and minification are still good; merging unrelated files into one cache unit is not.

## Verification

- DevTools → Network → enable the "Protocol" column. If you see `h2`/`h3`, sharding and concatenation are working against you.
- Count hostnames serving static assets. More than one origin for the same site is a sharding smell.
- Look for a single large `sprite.png`/`icons.png` or one giant `app.css` — candidates to split.
