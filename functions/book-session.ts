import type { Env } from './_lib/types';

const MESSAGE = 'Hi, I would like to book a handwriting analysis session.';

// The booking WhatsApp number is a Cloudflare secret (WHATSAPP_BOOKING, digits with country code).
// It never appears in the page, the scripts or the repository: visitors are redirected here first.
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const number = (env.WHATSAPP_BOOKING ?? '').replace(/\D/g, '');
  const target = /^\d{10,15}$/.test(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent(MESSAGE)}`
    : new URL('/contact/', request.url).toString();

  return new Response(null, {
    status: 302,
    headers: { Location: target, 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
};
