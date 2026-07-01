import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { categories, statusLabel, site } from "~/lib/site";

// Derived Markdown mirror of /checklist/ — a copy-and-paste checklist with
// GitHub-flavoured task-list syntax (`- [ ]`), grouped by category, each item
// linked to its spec page with its status and summary. Same source of truth as
// checklist.astro; do not hand-edit. Requested in discussion #63.

// Escape characters that would break Markdown link text or render as raw HTML
// (some titles are literal tag names like `<meta name="description">`).
function esc(s: string): string {
  return s.replace(/[\\[\]<>]/g, (c) => `\\${c}`);
}

// Body/prose text only needs angle brackets escaped so tag-like fragments
// (`<html>`, `<!doctype html>`) render literally instead of being swallowed as
// HTML. Backticks and other Markdown are left intact so inline code still works.
function escProse(s: string): string {
  return s.replace(/[<>]/g, (c) => `\\${c}`);
}

export const GET: APIRoute = async () => {
  const all = await getCollection("spec", ({ data }) => !data.draft);
  const grouped: Record<string, typeof all> = {};
  for (const e of all) (grouped[e.data.category] ??= []).push(e);
  for (const k of Object.keys(grouped)) {
    grouped[k].sort(
      (a, b) =>
        a.data.order - b.data.order || a.data.title.localeCompare(b.data.title),
    );
  }

  const lines: string[] = [
    "# The Website Specification — Checklist",
    "",
    "Every spec item, grouped by category. Copy into an issue or a note and tick as you go.",
    "",
    `Source: ${site.url}/checklist/ · Licensed CC BY 4.0`,
    "",
  ];

  for (const c of categories) {
    const items = grouped[c.slug] ?? [];
    if (!items.length) continue;
    lines.push(`## ${c.title}`, "", c.summary, "");
    for (const entry of items) {
      const slug = entry.data.slug ?? entry.id.split("/").pop()!;
      const url = `${site.url}/spec/${entry.data.category}/${slug}/`;
      const status = statusLabel[entry.data.status] ?? entry.data.status;
      lines.push(`- [ ] [${esc(entry.data.title)}](${url}) — ${status}`);
      lines.push(`  ${escProse(entry.data.summary.trim())}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Robots-Tag": "index, follow",
    },
  });
};
