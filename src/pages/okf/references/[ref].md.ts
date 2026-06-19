import type { APIRoute, GetStaticPaths } from "astro";
import { getOkfData, renderReference } from "~/lib/okf";

const md = { "Content-Type": "text/markdown; charset=utf-8" };

export const getStaticPaths: GetStaticPaths = async () => {
  const data = await getOkfData();
  return data.references.map((r) => ({
    params: { ref: r.slug },
    props: { reference: r },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  return new Response(renderReference(props.reference), { headers: md });
};
