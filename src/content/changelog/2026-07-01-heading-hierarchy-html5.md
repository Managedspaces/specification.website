---
title: Heading hierarchy, the HTML5 outline, and hgroup
date: "2026-07-01"
type: changed
relatedSlugs: [heading-hierarchy]
---

Refreshed the [heading hierarchy](/spec/seo/heading-hierarchy/) page. Corrected the stale note that nesting multiple `<h1>`s in sectioning roots is permitted: the HTML5 document-outline algorithm was never implemented, that pattern is now non-conforming, and the browser default that shrank a sectioned `<h1>` was removed from the spec in 2025. Added guidance to use `<hgroup>` for a title and its subtitle rather than two heading tags, and scoped heading uniqueness to sibling headings within a branch rather than the whole page.
