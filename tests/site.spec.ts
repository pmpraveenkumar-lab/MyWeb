import { test, expect } from '@playwright/test';

// The Turnstile widget comes from Cloudflare; tests never depend on the network.
test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: '' }),
  );
});

// Crawls the built site from "/" by following internal links, so new pages are
// covered automatically with no list to maintain.
test('every reachable page loads cleanly', async ({ page, request }) => {
  const problems: string[] = [];
  const seen = new Set<string>();
  const queue = ['/'];

  page.on('pageerror', (e) => problems.push(`JS error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));

  while (queue.length) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);

    const res = await page.goto(path);
    if (res?.status() !== 200) {
      problems.push(`${path}: HTTP ${res?.status()}`);
      continue;
    }
    if (!(await page.title())) problems.push(`${path}: missing <title>`);
    if ((await page.locator('h1').count()) !== 1) problems.push(`${path}: expected exactly one <h1>`);

    const hrefs = await page.locator('a[href]').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).href),
    );
    for (const href of hrefs) {
      const url = new URL(href);
      if (url.origin !== new URL(page.url()).origin) continue;
      queue.push(url.pathname);
    }
  }

  // Home, About, Programs, Testimonials, Contact, Enroll, Privacy
  expect(seen.size).toBeGreaterThanOrEqual(7);
  expect(problems).toEqual([]);

  const missing = await request.get('/definitely-not-a-page/');
  expect(missing.status()).toBe(404);
});

test('the admin page is kept out of search engines and is not linked from the site', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href*="admin"]')).toHaveCount(0);
  await page.goto('/admin/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
