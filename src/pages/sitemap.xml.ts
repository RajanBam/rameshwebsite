import type { APIRoute } from 'astro';
import { IMPLEMENTED_TOOLS } from '../lib/registry';
import { SITE } from '../lib/site';

// Registry-driven sitemap. Stays in sync as tools are added.
export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? `${SITE.domain}/`).replace(/\/$/, '');
  const staticPaths = [
    '/', '/tools/', '/privacy/', '/about/', '/contact/',
    '/privacy-policy/', '/terms/', '/cookies/', '/disclaimer/',
  ];
  const toolPaths = IMPLEMENTED_TOOLS.map((t) => `/tools/${t.slug}/`);
  const urls = [...staticPaths, ...toolPaths];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
