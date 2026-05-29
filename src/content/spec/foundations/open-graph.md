---
title: "Open Graph protocol"
slug: open-graph
category: foundations
summary: "Open Graph tags control how pages look when shared on social platforms and chat apps. Set og:title, og:description, og:image, og:url, and og:type on every page."
status: recommended
order: 100
appliesTo: [all]
relatedSlugs: [title, meta-description, canonical-url, favicons]
updated: "2026-05-29"
sources:
  - title: "The Open Graph protocol"
    url: "https://ogp.me/"
    publisher: "ogp.me"
  - title: "MDN — The Open Graph protocol"
    url: "https://developer.mozilla.org/en-US/docs/Web/OpenGraph"
    publisher: "MDN"
  - title: "X — About Cards"
    url: "https://developer.x.com/en/docs/x-for-websites/cards/overview/abouts-cards"
    publisher: "X"
  - title: "Google Search Central — Google Discover and your website"
    url: "https://developers.google.com/search/docs/appearance/google-discover"
    publisher: "Google"
  - title: "WhatsApp — Link previews"
    url: "https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/"
    publisher: "Meta"
---

## What it is

Open Graph (OG) is a set of `<meta>` tags, originally introduced by Facebook in 2010 and now supported by virtually every social platform, chat app, and link-preview tool. They tell the platform how to display your page when someone pastes the URL.

```html
<meta property="og:title" content="The lang attribute on <html>" />
<meta property="og:description" content="Set a valid BCP 47 language tag on <html> so screen readers, translators, and search engines know what language the page is in." />
<meta property="og:image" content="https://example.com/og/html-lang.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="675" />
<meta property="og:url" content="https://example.com/foundations/html-lang" />
<meta property="og:type" content="article" />
```

Note `property=` (not `name=`) — Open Graph predates the standard `meta name` registry and uses the RDFa attribute.

## Why it matters

When a link is pasted into Slack, Discord, iMessage, WhatsApp, LinkedIn, Mastodon, Bluesky, or X, the platform fetches the page and reads the OG tags to build a preview card. Without them, the platform falls back to whatever it can scrape — sometimes the `<title>` and meta description, sometimes the first image it can find, sometimes nothing. The result is unpredictable and often unflattering.

A good preview card gives the link a thumbnail, a headline, and a one-line description. Posts with card previews get measurably more clicks than bare URLs. For any content you want shared, OG tags are the difference between a polished preview and a naked URL.

## How to implement

Five tags do most of the work:

- **`og:title`** — the headline. Usually shorter than the HTML `<title>` (no site suffix needed; the platform shows the domain separately).
- **`og:description`** — the snippet under the title. 60–200 characters reads well on most platforms.
- **`og:image`** — an absolute URL to the preview image.
- **`og:url`** — the canonical absolute URL of the page. Match your `<link rel="canonical">`.
- **`og:type`** — the kind of object: `website` for the homepage, `article` for posts, `product` for shop items.

For the image, there are two sensible sizes:

- **1200 × 630** (1.91:1) — the historical Open Graph default. Works on Facebook, LinkedIn, Slack, Discord, iMessage, Bluesky, and Mastodon.
- **1200 × 675** (16:9) — also works on every OG platform, *and* satisfies [Google Discover](https://developers.google.com/search/docs/appearance/google-discover), which only surfaces large-format cards when the image is at least 1200 px wide and roughly 16:9. If you care about appearing in Discover (and you should, if your content is Discover-eligible), 1200 × 675 is the more portable choice — and you also need `<meta name="robots" content="max-image-preview:large">` for Google to use the full-width version.

Other constraints, regardless of which size you pick:

- File size under 5 MB across most platforms, but **WhatsApp drops the preview entirely if the image is over 300 KB** — and WhatsApp is one of the most-used unfurlers on the planet. Treat 300 KB as the real ceiling.
- **Format: PNG or JPEG is the safe universal choice.** WebP is now accepted by virtually every modern unfurler (Facebook, LinkedIn, Discord, iMessage, Slack, Mastodon, Bluesky, X, WhatsApp) and is a good pick when you need to stay under WhatsApp's 300 KB cap on a denser image. AVIF is *not* yet safe — only Facebook, Threads, Pinterest, and WhatsApp render AVIF previews today; the rest will silently drop them. If your CMS auto-converts uploads to AVIF, force the `og:image` URL to stay PNG/JPEG/WebP.
- No critical content within 60 pixels of any edge — platforms crop differently.
- Declare `og:image:width` and `og:image:height`. Some platforms refuse to use images they cannot pre-size.
- Serve over HTTPS. HTTP images are rejected.
- Use absolute URLs. Relative `og:image` paths are not portable.

For X (Twitter), add Twitter Card tags as a fallback. X prefers them when present:

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="The lang attribute on <html>" />
<meta name="twitter:description" content="Set a valid BCP 47 language tag on <html>..." />
<meta name="twitter:image" content="https://example.com/og/html-lang.png" />
```

If you skip the Twitter Card tags, X will fall back to your OG tags, which is fine. The one extra value worth adding is `twitter:card` set to `summary_large_image` so the preview shows the full-width image instead of a small thumbnail.

Generate the image per page when you can. A unique illustration or screenshot per article is more engaging than a single site-wide card. Many sites generate them on-demand at build time or with an edge function.

## Common mistakes

- Using `name="og:title"` instead of `property="og:title"`. The protocol requires `property`.
- Relative URLs in `og:image` or `og:url`. Always absolute, always HTTPS.
- Image dimensions that drift from 1.91:1 or 16:9 — cropped badly on every platform.
- Shipping a 1200 × 630 image *and* wanting Google Discover traffic. Discover wants 16:9 at ≥ 1200 px wide; 1200 × 675 satisfies both worlds.
- A beautiful 600 KB PNG that WhatsApp silently refuses to preview. Compress, downscale, or switch to WebP until you are under 300 KB.
- Serving `og:image` as AVIF. Most platforms cannot render it and will skip the card entirely.
- Missing `og:image:width` and `og:image:height`. Some platforms skip the image entirely without them.
- One generic OG image reused on every page. Works, but missing an opportunity.
- `og:url` that does not match the canonical URL. The two should agree.

## Verification

- View source and check the five core tags are present and absolute.
- Paste the URL into a debugger (Facebook Sharing Debugger, LinkedIn Post Inspector, Slack's link unfurler, or a direct paste into a chat).
- Confirm the image renders at full width, the title is correct, and the description matches.
- After updating tags, re-scrape on platforms that cache previews aggressively (Facebook, LinkedIn) so they pick up the new values.
