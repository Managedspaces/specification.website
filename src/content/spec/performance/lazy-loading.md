---
title: "Lazy loading images and iframes"
slug: lazy-loading
category: performance
summary: 'Native lazy loading defers off-screen images and iframes until the user scrolls near them. Use loading="lazy" — but never on the LCP image.'
status: recommended
order: 30
appliesTo: [all]
relatedSlugs: [image-optimization, core-web-vitals, preload-prefetch-preconnect]
updated: "2026-05-29"
sources:
  - title: "MDN — <img> loading attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#loading"
    publisher: "MDN"
  - title: "MDN — <iframe> loading attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#loading"
    publisher: "MDN"
  - title: "web.dev — Browser-level image lazy loading"
    url: "https://web.dev/articles/browser-level-image-lazy-loading"
    publisher: "web.dev"
  - title: "MDN — decoding attribute"
    url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img#decoding"
    publisher: "MDN"
---

## What it is

The `loading` attribute on `<img>` and `<iframe>` lets the browser defer fetching the resource until it is close to the viewport. It is a single HTML attribute — no JavaScript, no IntersectionObserver code.

```html
<img src="diagram.webp" width="800" height="600" loading="lazy" decoding="async" alt="…">
<iframe src="https://www.youtube.com/embed/…" loading="lazy" title="Demo"></iframe>
```

Valid values: `lazy` (defer), `eager` (load immediately, the default).

## Why it matters

A typical article page has a dozen images below the fold that the user may never scroll to. Loading them eagerly costs bandwidth, blocks more important requests, and steals decode time from the main thread. Lazy loading defers that work, often cutting initial bytes by 30–60% on long pages.

`decoding="async"` is complementary: it lets the browser decode the image off the main thread, so the image arriving doesn't jank scrolling or interactions.

## How to implement

**Default off-screen images to lazy.** Anything below the fold — gallery thumbnails, author avatars, embedded tweets, YouTube embeds — should be `loading="lazy"`.

**Keep the LCP image eager.** The hero image, the article lead, the product photo — these must not be lazy-loaded. Browsers honour `loading="lazy"` even when the image is just below the fold on a small viewport, and the LCP cost is significant. When in doubt, use `loading="eager"` (or omit the attribute) for above-the-fold images.

**Add `decoding="async"` to all images.** It has no downside and helps with main-thread responsiveness.

**Lazy-load iframes by default.** YouTube and map embeds pull hundreds of kilobytes of JavaScript on every page view. `loading="lazy"` on the iframe defers all of it.

**Keep `width` and `height`.** Lazy loading does not change layout — without dimensions you still get CLS when the image arrives.

## Common mistakes

- `loading="lazy"` on the LCP image. The single biggest lazy-loading mistake. Lighthouse and PageSpeed Insights flag it explicitly.
- Custom JavaScript lazy-loaders running on top of native lazy loading, doubling the work.
- Lazy-loading every image to "be safe" — the first screenful must load eagerly.
- Omitting dimensions, so lazy-loaded images shift the layout on arrival.

## Verification

- DevTools → Network → throttle to "Slow 4G", reload, watch which images fetch immediately and which wait for scroll.
- Lighthouse audit: "Largest Contentful Paint image was lazily loaded" is a hard failure to fix.
- View source: every below-the-fold `<img>` and `<iframe>` should have `loading="lazy"`.
