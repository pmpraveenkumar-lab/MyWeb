# The Art of Beautiful Handwriting

Static site (Astro) with an enrollment form. Submissions go to a Cloudflare D1 database and are
viewed on a login-protected `/admin/` page. Hosted on Cloudflare Pages.

## Everyday use

```
npm run dev        # site only, http://localhost:4321 (the form will not save here)
npm run dev:cf     # site + form + admin + database, http://localhost:8788
npm test           # type-check is `npm run check`; this runs all tests
```

- Change the name, phone, email, location and menu in `src/site.ts`.
- Pages are files in `src/pages/`. Colours and fonts are the variables at the top of `src/styles/global.css`.
- Commit and push to `main`; Cloudflare builds and publishes it.

### First run of `dev:cf`

```
cp .dev.vars.example .dev.vars   # then put your email in ADMIN_EMAIL
cp .env.example .env
npm run db:local                 # creates the local database
npm run dev:cf
```

Local admin: http://localhost:8788/admin/ (the login is skipped on `localhost` only).

## One-time Cloudflare setup

1. **Account:** create a free account at cloudflare.com.
2. **Database:** `npx wrangler login`, then `npx wrangler d1 create handwriting-enrollments`.
   Paste the printed `database_id` into `wrangler.toml`, then `npx wrangler d1 migrations apply DB --remote`.
3. **Pages project:** Workers & Pages → Create → Pages → connect the GitHub repo.
   Build command `npm run build`, output directory `dist`.
4. **Bind the database:** project → Settings → Bindings → D1 database, variable name `DB`.
5. **Spam protection:** Turnstile → add a widget for your domain.
   - Site key: project → Settings → Variables, build variable `PUBLIC_TURNSTILE_SITEKEY`.
   - Secret key: runtime secret `TURNSTILE_SECRET`.
6. **Admin login:** Zero Trust → Access → Applications → add a self-hosted application for
   `yourdomain.com/admin/*` and `yourdomain.com/api/admin/*`, with a policy allowing only your email.
   Then set these runtime variables on the Pages project:
   - `ACCESS_TEAM_DOMAIN` = `yourteam.cloudflareaccess.com`
   - `ACCESS_AUD` = the application's Audience tag
   - `ADMIN_EMAIL` = your email
7. **Domain:** project → Custom domains → add it. If the domain is registered at Cloudflare this is one click.

The admin code checks Cloudflare's signed login token itself, so if step 6 is missed or wrong the admin
area stays closed instead of open.

## Security notes

- Server-side validation of every field, parameterised SQL, consent required, hidden spam-trap field,
  Turnstile check, same-origin check, request size limit.
- Strict security headers and Content-Security-Policy in `public/_headers`.
- Admin page renders submitted text as plain text, and the CSV export defuses spreadsheet formulas.
- Nothing secret is in the repo: secrets live in Cloudflare and in the git-ignored `.dev.vars`.
