import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { categories, type CategorySlug } from '~/lib/site';
import { site } from '~/lib/site';
import { renderUrlset, xmlResponse, type SitemapEntry } from '~/lib/sitemap';

export const getStaticPaths: GetStaticPaths = () =>
  categories.map((c) => ({ params: { category: c.slug } }));

export const GET: APIRoute = async ({ params }) => {
  const category = params.category as CategorySlug;
  const entries = await getCollection(
    'spec',
    ({ data }) => !data.draft && data.category === category,
  );
  entries.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));

  const urls: SitemapEntry[] = [];
  let newest = '';
  for (const e of entries) {
    const slug = e.data.slug ?? e.id.split('/').pop()!;
    urls.push({
      loc: `${site.url}/spec/${category}/${slug}/`,
      lastmod: e.data.updated,
    });
    if (e.data.updated && e.data.updated > newest) newest = e.data.updated;
  }
  // Category index page tracks the newest entry it lists.
  urls.unshift({
    loc: `${site.url}/spec/${category}/`,
    lastmod: newest || undefined,
  });

  return xmlResponse(renderUrlset(urls));
};
