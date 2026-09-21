import { test, expect } from '@playwright/test';
import { onRequestGet } from '../functions/book-session';
import type { Env } from '../functions/_lib/types';

const call = (env: Partial<Env>) =>
  onRequestGet({ request: new Request('https://example.com/book-session'), env } as Parameters<typeof onRequestGet>[0]) as Promise<Response>;

test('redirects to WhatsApp with the number from the secret', async () => {
  const res = await call({ WHATSAPP_BOOKING: '+91 90000 00000' });
  expect(res.status).toBe(302);
  const location = new URL(res.headers.get('Location')!);
  expect(location.origin + location.pathname).toBe('https://wa.me/919000000000');
  expect(location.searchParams.get('text')).toContain('handwriting analysis session');
  expect(res.headers.get('Cache-Control')).toBe('no-store');
});

test('falls back to the contact page when the secret is missing or malformed', async () => {
  for (const value of [undefined, '', 'abc', '123']) {
    const res = await call({ WHATSAPP_BOOKING: value });
    expect(res.headers.get('Location')).toBe('https://example.com/contact/');
  }
});

test('the booking number is not in the built site', async ({ request }) => {
  const html = await (await request.get('/about/')).text();
  expect(html).toContain('href="/book-session"');
  expect(html).not.toMatch(/wa\.me\/\d/);
});
