import type { APIRoute } from 'astro';
import { IMPLEMENTED_TOOLS } from '../lib/registry';

// Registry-driven sitemap — stays in sync as tools are added.
export const GET: APIRoute = ({ site }) => {
  const base = (site?.href ?? 'https://tools.example.com/').replace(/\/$/, '');
  const staticPaths = ['/', '/tools/', '/privacy/', '/about/'];
  const toolPaths = IMPLEMENTED_TOOLS.map((t) => `/tools/${t.slug}/`);
  const urls = [...staticPaths, ...toolPaths];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
