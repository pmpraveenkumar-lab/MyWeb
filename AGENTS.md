# Website

Static site built with Astro, deployed to GitHub Pages on every push to `main`.

## Commands

- `npm run dev` — dev server at http://localhost:4321 (use `astro dev --background` when driven by an agent; manage with `astro dev stop|status|logs`)
- `npm run check` — type-check `.astro` and `.ts` files
- `npm test` — build, preview and crawl every reachable page with Playwright
- `npm run build` — production build into `dist/`

## Conventions

- Pages live in `src/pages/`; the file name is the URL.
- Shared chrome is in `src/layouts/Base.astro`; design tokens are the CSS variables at the top of `src/styles/global.css`.
- Build internal links from `import.meta.env.BASE_URL`, never a bare `/`, so the site works under a GitHub Pages sub-path.
- Ship no client JavaScript unless a page needs it; add an island with `astro add react` (or svelte, vue) when that time comes.

## Documentation

Full documentation: https://docs.astro.build

- [Routing](https://docs.astro.build/en/guides/routing/)
- [Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Framework components (React, Vue, Svelte)](https://docs.astro.build/en/guides/framework-components/)
- [Content collections](https://docs.astro.build/en/guides/content-collections/)
- [Styling and Tailwind](https://docs.astro.build/en/guides/styling/)
- [Internationalization](https://docs.astro.build/en/guides/internationalization/)
