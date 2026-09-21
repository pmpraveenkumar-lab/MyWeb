import { test, expect } from '@playwright/test';
import { isAdmin } from '../functions/_lib/access';
import type { Env } from '../functions/_lib/types';

const TEAM = 'test.cloudflareaccess.com';
const AUD = 'aud-123';
const ADMIN = 'owner@example.com';
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ADMIN_EMAIL: ADMIN } as Env;

const b64url = (b: ArrayBuffer | string) =>
  Buffer.from(typeof b === 'string' ? b : new Uint8Array(b)).toString('base64url');

let sign: (claims: Record<string, unknown>, kid?: string) => Promise<string>;
const realFetch = globalThis.fetch;

test.beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const pub = await crypto.subtle.exportKey('jwk', pair.publicKey);
  globalThis.fetch = (async () => Response.json({ keys: [{ kid: 'k1', kty: pub.kty, n: pub.n, e: pub.e }] })) as typeof fetch;

  sign = async (claims, kid = 'k1') => {
    const head = b64url(JSON.stringify({ alg: 'RS256', kid }));
    const body = b64url(JSON.stringify(claims));
    const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(`${head}.${body}`));
    return `${head}.${body}.${b64url(sig)}`;
  };
});

test.afterAll(() => {
  globalThis.fetch = realFetch;
});

const now = () => Math.floor(Date.now() / 1000);
const good = () => ({ email: ADMIN, aud: [AUD], iss: `https://${TEAM}`, exp: now() + 300 });
const req = (token?: string, host = 'example.com') =>
  new Request(`https://${host}/api/admin/enrollments`, token ? { headers: { 'Cf-Access-Jwt-Assertion': token } } : {});

test('accepts a valid token for the admin', async () => {
  expect(await isAdmin(req(await sign(good())), env)).toBe(true);
});

test('refuses when there is no token, a garbage token, or a bad signature', async () => {
  expect(await isAdmin(req(), env)).toBe(false);
  expect(await isAdmin(req('a.b.c'), env)).toBe(false);
  const t = await sign(good());
  expect(await isAdmin(req(t.slice(0, -4) + 'AAAA'), env)).toBe(false);
});

test('refuses expired, wrong audience, wrong issuer, wrong user and unknown key', async () => {
  expect(await isAdmin(req(await sign({ ...good(), exp: now() - 10 })), env)).toBe(false);
  expect(await isAdmin(req(await sign({ ...good(), aud: ['other'] })), env)).toBe(false);
  expect(await isAdmin(req(await sign({ ...good(), iss: 'https://evil.example' })), env)).toBe(false);
  expect(await isAdmin(req(await sign({ ...good(), email: 'someone@else.com' })), env)).toBe(false);
  expect(await isAdmin(req(await sign(good(), 'other-kid')), env)).toBe(false);
});

test('is closed when Access is not configured', async () => {
  expect(await isAdmin(req(await sign(good())), {} as Env)).toBe(false);
});

test('dev bypass only works on localhost', async () => {
  const dev = { DEV_ADMIN_BYPASS: '1' } as Env;
  expect(await isAdmin(req(undefined, 'localhost:8788'), dev)).toBe(true);
  expect(await isAdmin(req(undefined, 'mysite.com'), dev)).toBe(false);
});
