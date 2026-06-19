import type { APIRoute } from "astro";
import { getOkfData, renderReferencesIndex } from "~/lib/okf";

const md = { "Content-Type": "text/markdown; charset=utf-8" };

export const GET: APIRoute = async () => {
  const data = await getOkfData();
  return new Response(renderReferencesIndex(data.references), { headers: md });
};
