// Central site identity — the single place that names the product.
// Change the brand name or domain here and it updates across the whole
// site: nav, footer, titles, canonical URLs, sitemap, robots and OG tags.
//
// NOTE: `name` and `domain` are a working brand chosen for launch.
// Swapping either is a one-line edit here. Verify domain registration
// before going live.

export const SITE = {
  /** Product name shown to users. */
  name: 'Toolora',
  /** Production origin, no trailing slash. */
  domain: 'https://toolora.com',
  /** One-line description reused in meta + structured data. */
  description:
    'Free tools that run entirely in your browser. Unlimited files, nothing uploaded, works offline.',
  /** Contact address surfaced on About, Contact and legal pages. */
  email: 'contact@rameshkadariya.com.np',
} as const;
