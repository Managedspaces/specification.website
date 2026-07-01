---
title: HSTS preloading is no longer recommended
date: "2026-07-01"
type: changed
relatedSlugs: [hsts]
---

Reframed the [HSTS](/spec/security/hsts/) page so the recommended header no longer includes `preload`. As [@nfriedli pointed out in discussion #45](https://github.com/jdevalk/specification.website/discussions/45), the preload list's own operator now advises against preloading — modern browsers auto-upgrade HTTP navigations to HTTPS regardless of any HSTS policy, so the marginal benefit is minimal while the multi-month removal commitment is not. The recommended header is now `max-age=63072000; includeSubDomains`, and this site's own header dropped `preload` to match.
