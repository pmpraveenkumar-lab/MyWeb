export interface Enrollment {
  name: string;
  phone: string;
  email: string;
}

export type Validation = { ok: true; value: Enrollment } | { ok: false; errors: string[] };

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function asText(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export function validateEnrollment(input: {
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  consent?: unknown;
}): Validation {
  const errors: string[] = [];

  const rawName = asText(input.name);
  const name = rawName.replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 100 || !/\p{L}/u.test(name) || CONTROL_CHARS.test(rawName.replace(/\s/g, ''))) {
    errors.push('name');
  }

  // Accept common separators, store digits with an optional leading "+".
  const phone = asText(input.phone).replace(/[\s\-().]/g, '');
  if (!/^\+?\d{7,15}$/.test(phone)) errors.push('phone');

  const email = asText(input.email).trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('email');

  const consent = asText(input.consent);
  if (consent !== 'on' && consent !== 'true') errors.push('consent');

  return errors.length ? { ok: false, errors } : { ok: true, value: { name, phone, email } };
}

/** Stops spreadsheet apps from running a cell that starts with a formula character. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
