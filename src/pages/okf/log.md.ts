import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

// OKF log.md (§7): change history, date-grouped, newest first, no frontmatter.
// Derived from the hand-curated changelog collection — the same source as
// /changelog/ and its RSS feed.

const md = { "Content-Type": "text/markdown; charset=utf-8" };

// changelog `type` → conventional OKF leading bold word (§7).
const LEAD: Record<string, string> = {
  added: "Creation",
  removed: "Deprecation",
  changed: "Update",
  status: "Update",
};

export const GET: APIRoute = async () => {
  const entries = await getCollection("changelog", ({ data }) => !data.draft);
  entries.sort((a, b) => (a.data.date < b.data.date ? 1 : -1));

  const byDate = new Map<string, typeof entries>();
  for (const e of entries) {
    const arr = byDate.get(e.data.date) ?? [];
    arr.push(e);
    byDate.set(e.data.date, arr);
  }

  const lines = ["# Change log", ""];
  for (const [date, items] of byDate) {
    lines.push(`## ${date}`, "");
    for (const e of items) {
      const lead = LEAD[e.data.type] ?? "Update";
      const body = (e.body ?? "").trim().replace(/\s+/g, " ");
      lines.push(`* **${lead}**: ${e.data.title}. ${body}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), { headers: md });
};
