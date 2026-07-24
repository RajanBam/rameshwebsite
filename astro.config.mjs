import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';

// Update `site` to the production domain once the name/domain is chosen.
export default defineConfig({
  site: 'https://tools.example.com',
  output: 'static',
  integrations: [preact(), sitemap()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Keep worker + wasm chunks predictable for offline caching later.
      assetsInlineLimit: 0,
    },
  },
});
