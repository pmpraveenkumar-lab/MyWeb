import type { Env } from '../_lib/types';
import { validateEnrollment } from '../_lib/validate';

const MAX_BODY_BYTES = 10_000;

const redirect = (request: Request, path: string) => Response.redirect(new URL(path, request.url).toString(), 303);

async function turnstileOk(env: Env, token: string, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.set('secret', env.TURNSTILE_SECRET);
  body.set('response', token);
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);

  // Only accept submissions from our own pages.
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return new Response('Forbidden', { status: 403 });

  if (!env.TURNSTILE_SECRET || !env.DB) return redirect(request, '/enroll/?error=server');

  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY_BYTES) {
    return new Response('Payload too large', { status: 413 });
  }
  const type = request.headers.get('Content-Type') ?? '';
  if (!type.includes('application/x-www-form-urlencoded') && !type.includes('multipart/form-data')) {
    return new Response('Unsupported media type', { status: 415 });
  }

  const form = await request.formData();

  // Hidden trap field: people never see it, bots fill it in. Pretend it worked.
  if (form.get('website')) return redirect(request, '/thank-you/');

  const result = validateEnrollment({
    name: form.get('name'),
    phone: form.get('phone'),
    email: form.get('email'),
    consent: form.get('consent'),
  });
  if (!result.ok) return redirect(request, '/enroll/?error=invalid');

  const token = form.get('cf-turnstile-response');
  const human =
    typeof token === 'string' && token !== '' && (await turnstileOk(env, token, request.headers.get('CF-Connecting-IP')));
  if (!human) return redirect(request, '/enroll/?error=captcha');

  try {
    const { name, phone, email } = result.value;
    await env.DB.prepare('INSERT INTO enrollments (name, phone, email, created_at) VALUES (?1, ?2, ?3, ?4)')
      .bind(name, phone, email, new Date().toISOString())
      .run();
  } catch (err) {
    console.error('enrollment insert failed', err instanceof Error ? err.message : 'unknown');
    return redirect(request, '/enroll/?error=server');
  }

  return redirect(request, '/thank-you/');
};
