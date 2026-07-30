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

  /** Google AdSense publisher ID, e.g. 'ca-pub-1234567890123456'.
   *  Leave EMPTY to keep all ads off (the site ships with no ad code at all).
   *  To turn ads on after you are approved by AdSense:
   *    1. Paste your publisher ID here.
   *    2. Create an ad unit in the AdSense dashboard and paste its ID into
   *       `adsenseInlineSlot` below (this is the ad shown under each tool).
   *    3. In public/_headers, switch the CSP line to the AdSense-ready one
   *       noted there, or the ads will be blocked by the security policy. */
  adsense: '',
  /** Ad unit ID for the slot shown below each tool. Only used when `adsense`
   *  is also set. Leave empty to show no inline unit (Auto ads still work). */
  adsenseInlineSlot: '',
} as const;
