// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL and BASE_PATH are optional. Unset (the default), the site is served from "/",
// which is right for Cloudflare Pages and for a custom domain.
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
  vite: {
    // Keep scripts as separate files so the Content-Security-Policy (public/_headers)
    // can forbid inline scripts.
    build: { assetsInlineLimit: 0 },
  },
});
