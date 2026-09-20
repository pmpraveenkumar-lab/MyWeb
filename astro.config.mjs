// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL and BASE_PATH are set by the deploy workflow (from GitHub Pages),
// so the same code works on a project page, a user page or a custom domain.
// Locally both are unset and the site is served from "/".
export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH || '/',
  trailingSlash: 'always',
});
