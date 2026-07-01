---
title: "Content-based field sizing"
slug: field-sizing
category: foundations
summary: "Let text inputs, textareas, and selects shrink-wrap and grow with their content using field-sizing: content — one line of CSS that replaces the JavaScript auto-grow hack."
status: optional
order: 180
appliesTo: [all]
relatedSlugs: [mobile-form-inputs, form-labels, touch-target-size, text-wrap, container-queries]
updated: "2026-07-01T00:00:00.000Z"
sources:
  - title: "CSS Form Control Styling Level 1 — field-sizing"
    url: "https://drafts.csswg.org/css-forms-1/#propdef-field-sizing"
    publisher: "W3C CSS Working Group"
  - title: "MDN — field-sizing"
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing"
    publisher: "MDN"
  - title: "CSS field-sizing"
    url: "https://developer.chrome.com/docs/css-ui/css-field-sizing"
    publisher: "Chrome for Developers"
---

## What it is

`field-sizing` is a CSS property that controls how form controls with a default preferred size decide that size. The default, `field-sizing: fixed`, gives every control the same box regardless of what it holds. `field-sizing: content` instead lets the control shrink-wrap its content and grow as more is typed.

```css
input,
textarea,
select {
  field-sizing: content;
  min-width: 4rem;
  max-width: 100%;
}
```

It applies to the controls that carry an intrinsic size: text-entry `<input>` types (`text`, `email`, `password`, `search`, `tel`, `url`, `number`), `file` inputs, `<textarea>`, and `<select>`. A `<textarea>` grows along the inline axis until a width limit, then wraps onto new lines and finally scrolls. A drop-down `<select>` resizes to the chosen option; a list box (`multiple` / `size`) shows every option at once.

## Why it matters

- **It replaces JavaScript.** Auto-growing a comment box or chat input has meant a resize listener that measures `scrollHeight` and rewrites the height on every keystroke. `field-sizing: content` does the same thing in one declaration, with no script, no layout thrash, and no reflow bugs.
- **It degrades safely.** This is a pure progressive enhancement: browsers that do not understand it fall back to the normal fixed control. There is nothing to polyfill and no layout that depends on it, so no feature query is needed.
- **Better fit, less wasted space.** A field sized to its content reads as part of the sentence rather than an arbitrary box, and a textarea that reveals what you have written beats one you must scroll inside.

## How to implement

Set `field-sizing: content` on the controls that benefit, then bound them with `min-width` / `max-width` (and `min-height` / `max-height` for textareas). Those limits are what make the effect usable — **without a `min-width`, an empty field with no placeholder collapses to the width of the text cursor**. A `placeholder` gives it enough room to show the hint until the user types.

Avoid a fixed `width` or `height` alongside it: those re-impose a fixed box and cancel the behaviour. Note that `size`, `rows`, and `cols` stop having any effect once `field-sizing: content` is set — the content decides the size instead. `maxlength` still caps growth by capping input.

## Common mistakes

- **No lower bound.** An unconstrained empty field shrinks to the cursor. Always pair it with a sensible `min-width` (and `min-height` for multi-line).
- **Fixing the size too.** Declaring `width`/`height` re-imposes `fixed` sizing; use `min-*`/`max-*` instead.
- **Expecting `size`/`rows`/`cols` to still work.** They are ignored under `field-sizing: content`; reach for the CSS sizing properties.

## Verification

- Type into and clear a field: it should grow and shrink between its `min` and `max` bounds; a constrained textarea should wrap to new rows.
- Baseline: `field-sizing` became newly available across major browsers in June 2026 (Chrome 123, Safari 26.2, Firefox 152). Treat it as an enhancement over the plain fixed control for anyone on an older browser.
