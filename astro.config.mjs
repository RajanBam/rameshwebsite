import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

// Update `site` to the production domain once the name/domain is chosen.
export default defineConfig({
  site: 'https://tools.example.com',
  output: 'static',
  integrations: [preact()],
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
