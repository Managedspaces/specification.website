import type { APIRoute } from 'astro';
import { site } from '~/lib/site';
import { loadSpecLastmod, renderUrlset, xmlResponse, type SitemapEntry } from '~/lib/sitemap';

export const GET: APIRoute = async () => {
  const { newest } = await loadSpecLastmod();
  const collectionDerived = newest || undefined;

  const urls: SitemapEntry[] = [
    { loc: `${site.url}/`, lastmod: collectionDerived },
    { loc: `${site.url}/spec/`, lastmod: collectionDerived },
    { loc: `${site.url}/checklist/`, lastmod: collectionDerived },
    { loc: `${site.url}/about/` },
    { loc: `${site.url}/contribute/` },
    { loc: `${site.url}/mcp/` },
    { loc: `${site.url}/privacy/` },
    { loc: `${site.url}/search/` },
  ];

  return xmlResponse(renderUrlset(urls));
};
