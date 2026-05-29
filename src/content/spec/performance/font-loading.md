---
title: "Web font loading"
slug: font-loading
category: performance
summary: "Self-host WOFF2 fonts, subset them, preload the critical face, and use font-display: swap so text is readable while the font is still loading."
status: recommended
order: 70
appliesTo: [all]
relatedSlugs: [preload-prefetch-preconnect, critical-css, core-web-vitals]
updated: "2026-05-29T09:13:20.000Z"
sources:
  - title: "MDN — @font-face"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face"
    publisher: "MDN"
  - title: "web.dev — Best practices for fonts"
    url: "https://web.dev/articles/font-best-practices"
    publisher: "web.dev"
  - title: "MDN — font-display"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display"
    publisher: "MDN"
  - title: "web.dev — Avoid invisible text during font loading"
    url: "https://web.dev/articles/avoid-invisible-text"
    publisher: "web.dev"
---

## What it is

Web fonts are font files (TTF, OTF, WOFF, WOFF2) downloaded by the browser and applied via `@font-face`. Loading them well means short delay, no flash of invisible text, no layout shift when they swap in.

```css
@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-var.woff2") format("woff2-variations");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

## Why it matters

A custom font that loads late causes one of two bad outcomes: **FOIT** (flash of invisible text — the page renders blank rectangles), or **FOUT** (flash of unstyled text — system font flashes, then jumps to the custom font, causing CLS). Both hurt user experience and Core Web Vitals.

Fonts can also be heavy. A single weight of a Latin font is ~30KB in WOFF2; a full multi-script variable font can be 300KB+. They block paint of the text they style.

## How to implement

**Self-host.** Third-party font services add a DNS lookup, TLS handshake, and a second domain to track. Download the WOFF2 files and serve them from your origin.

**Use WOFF2 only.** All modern browsers support it. WOFF2 is pre-compressed (do not gzip), 30% smaller than WOFF, and 50% smaller than TTF.

**Subset to what you use.** Google Fonts' default Latin subset covers most English-language sites. If your content is English only, drop Cyrillic, Greek, and Vietnamese subsets — that can halve the file. Tools: `pyftsubset`, `glyphhanger`, `subfont`.

**Preload the critical face.** The body text font is render-blocking for most of the page. Preload it:

```html
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>
```

`crossorigin` is mandatory even for same-origin fonts — without it the preload misses the cache and the font fetches twice.

**Set `font-display`.** `swap` shows the fallback immediately and swaps when the custom font arrives. `optional` is stricter: if the font isn't cached and ready within ~100ms, the fallback is used permanently — best for CLS. Avoid `block`, which causes FOIT.

**Use variable fonts.** A single variable font file replaces 9 weight + style combinations and is usually smaller than 2 static weights.

**Match metrics to reduce shift.** Use `size-adjust`, `ascent-override`, and `descent-override` on the fallback `@font-face` so the swap doesn't reflow the layout.

## Common mistakes

- Loading from `fonts.googleapis.com` and a self-host preload. Double-fetch.
- Preloading without `crossorigin`. Double-fetch.
- `font-display: block` (or the default `auto`). Causes invisible text for up to 3 seconds.
- Shipping 6 static weights when a variable font covers all of them.
- Loading the full multi-script font for a Latin-only site.

## Verification

- DevTools → Network → filter by Font. Count requests; check sizes; confirm WOFF2.
- DevTools → Rendering → Emulate "Slow 4G" and reload. Watch for FOIT or large layout shifts.
- Lighthouse "Ensure text remains visible during webfont load" flags missing `font-display`.
