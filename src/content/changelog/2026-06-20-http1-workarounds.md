---
title: New page on HTTP/1.1 workarounds to avoid
date: "2026-06-20"
type: added
relatedSlugs: [http1-workarounds, http3]
---

Added an `avoid` page on [HTTP/1.1 workarounds — sharding, sprites, concatenation](/spec/performance/http1-workarounds/). Domain sharding, image sprites, and asset concatenation were all ways round HTTP/1.1's six-connection-per-origin limit; under [HTTP/2 and HTTP/3](/spec/performance/http3/) they break caching, defeat prioritisation, and ship bytes nobody asked for. With thanks to Jono for the nudge.
