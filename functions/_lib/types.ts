export interface Env {
  DB: D1Database;
  /** Cloudflare Turnstile secret key (set as a secret in the dashboard). */
  TURNSTILE_SECRET: string;
  /** e.g. "yourteam.cloudflareaccess.com" (Zero Trust → Settings → Custom pages). */
  ACCESS_TEAM_DOMAIN: string;
  /** Application Audience (AUD) tag of the Access application protecting /admin. */
  ACCESS_AUD: string;
  /** The one email address allowed into the admin area. */
  ADMIN_EMAIL: string;
  /** WhatsApp number for session bookings, digits with country code. Set as a secret. */
  WHATSAPP_BOOKING?: string;
  /** Local development only (.dev.vars). Ignored unless the host is localhost. */
  DEV_ADMIN_BYPASS?: string;
}
