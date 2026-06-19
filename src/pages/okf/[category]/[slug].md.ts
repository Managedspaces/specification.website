import type { APIRoute, GetStaticPaths } from "astro";
import { getOkfData, renderConcept } from "~/lib/okf";

const md = { "Content-Type": "text/markdown; charset=utf-8" };

export const getStaticPaths: GetStaticPaths = async () => {
  const data = await getOkfData();
  return data.concepts.map((c) => ({
    params: { category: c.category, slug: c.slug },
    props: { concept: c },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  return new Response(renderConcept(props.concept), { headers: md });
};
