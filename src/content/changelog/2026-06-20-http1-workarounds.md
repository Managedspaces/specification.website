---
title: New page on HTTP/1.1 workarounds to avoid
date: "2026-06-20"
type: added
relatedSlugs: [http1-workarounds, http3]
---

Added an `avoid` page on [HTTP/1.1 workarounds — sharding, sprites, and bundling](/spec/performance/http1-workarounds/). Domain sharding and image sprites were ways round HTTP/1.1's six-connection-per-origin limit and now fight a multiplexed [HTTP/2 / HTTP/3](/spec/performance/http3/) connection — drop them. Bundling is the nuanced case: stop concatenating to cut requests, but do it to cut bytes (compression favours larger inputs) — inline what blocks paint, concatenate what compresses, split what changes. With thanks to Jono.
