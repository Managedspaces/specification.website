import type { APIRoute, GetStaticPaths } from "astro";
import { getOkfData, renderCategoryIndex } from "~/lib/okf";

const md = { "Content-Type": "text/markdown; charset=utf-8" };

export const getStaticPaths: GetStaticPaths = async () => {
  const data = await getOkfData();
  return [...data.byCategory.keys()].map((category) => ({
    params: { category },
  }));
};

export const GET: APIRoute = async ({ params }) => {
  const data = await getOkfData();
  const category = params.category!;
  const concepts = data.byCategory.get(category) ?? [];
  return new Response(renderCategoryIndex(category, concepts), { headers: md });
};
