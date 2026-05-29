import type { APIRoute } from 'astro';
import { categories, site } from '~/lib/site';
import { loadSpecLastmod, renderSitemapIndex, xmlResponse } from '~/lib/sitemap';

export const GET: APIRoute = async () => {
  const { perCategory, newest } = await loadSpecLastmod();

  const sitemaps = [
    { loc: `${site.url}/sitemap-pages.xml`, lastmod: newest || undefined },
    ...categories
      .filter((c) => perCategory.has(c.slug))
      .map((c) => ({
        loc: `${site.url}/sitemap-${c.slug}.xml`,
        lastmod: perCategory.get(c.slug),
      })),
  ];

  return xmlResponse(renderSitemapIndex(sitemaps));
};
