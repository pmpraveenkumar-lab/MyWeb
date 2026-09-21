import type { Env } from './types';

// Verifies the signed token Cloudflare Access adds to every request it lets through.
// The site never trusts "Access is configured" on faith: if the token is missing,
// forged, expired, for another application or another user, the request is refused.

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
}

const KEY_TTL_MS = 60 * 60 * 1000;
const keyCache = new Map<string, { at: number; keys: Jwk[] }>();

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson(s: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function getKeys(team: string): Promise<Jwk[]> {
  const hit = keyCache.get(team);
  if (hit && Date.now() - hit.at < KEY_TTL_MS) return hit.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: Jwk[] };
  keyCache.set(team, { at: Date.now(), keys });
  return keys;
}

export async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const url = new URL(request.url);
  if (env.DEV_ADMIN_BYPASS === '1' && url.hostname === 'localhost') return true;

  const { ACCESS_TEAM_DOMAIN: team, ACCESS_AUD: aud, ADMIN_EMAIL: admin } = env;
  if (!team || !aud || !admin) return false; // not configured: closed, never open

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  const parts = token?.split('.');
  if (!parts || parts.length !== 3) return false;

  try {
    const header = decodeJson(parts[0]);
    const payload = decodeJson(parts[1]);
    if (header.alg !== 'RS256') return false;

    const jwk = (await getKeys(team)).find((k) => k.kid === header.kid);
    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), signed))) return false;

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= now) return false;
    if (payload.iss !== `https://${team}`) return false;
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audience.includes(aud)) return false;
    return typeof payload.email === 'string' && payload.email.toLowerCase() === admin.toLowerCase();
  } catch {
    return false;
  }
}

export const adminGuard: PagesFunction<Env> = async ({ request, env, next }) => {
  if (await isAdmin(request, env)) return next();
  return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
};
