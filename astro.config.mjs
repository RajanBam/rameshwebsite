import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import { SITE } from './src/lib/site.ts';

// The production origin lives in src/lib/site.ts (single source of truth).
export default defineConfig({
  site: SITE.domain,
  output: 'static',
  integrations: [preact()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    // Workers import WASM codecs (code-splitting), which needs ES format.
    worker: { format: 'es' },
    build: {
      // Keep worker + wasm chunks predictable for offline caching later.
      assetsInlineLimit: 0,
    },
  },
});
