import { test, expect } from '@playwright/test';
import { validateEnrollment, csvCell } from '../functions/_lib/validate';

const good = { name: 'Asha Rao', phone: '+91 98765-43210', email: 'Asha@Example.com', consent: 'on' };

test('accepts a normal enrollment and normalises it', () => {
  const r = validateEnrollment(good);
  expect(r).toEqual({ ok: true, value: { name: 'Asha Rao', phone: '+919876543210', email: 'asha@example.com' } });
});

test('accepts names in other scripts', () => {
  expect(validateEnrollment({ ...good, name: 'ಪ್ರವೀಣ್ ಕುಮಾರ್' }).ok).toBe(true);
});

test('rejects each bad field and reports which', () => {
  const bad = validateEnrollment({ name: 'A', phone: '12', email: 'nope', consent: undefined });
  expect(bad).toEqual({ ok: false, errors: ['name', 'phone', 'email', 'consent'] });
});

test('rejects missing consent, oversized and non-string input', () => {
  expect(validateEnrollment({ ...good, consent: '' }).ok).toBe(false);
  expect(validateEnrollment({ ...good, name: 'x'.repeat(101) }).ok).toBe(false);
  expect(validateEnrollment({ ...good, email: `${'a'.repeat(250)}@b.co` }).ok).toBe(false);
  expect(validateEnrollment({ ...good, name: { $ne: '' } }).ok).toBe(false);
  expect(validateEnrollment({ ...good, phone: null }).ok).toBe(false);
});

test('csvCell quotes values and defuses spreadsheet formulas', () => {
  expect(csvCell('Asha "A" Rao')).toBe('"Asha ""A"" Rao"');
  expect(csvCell('=HYPERLINK("http://evil")')).toBe(`"'=HYPERLINK(""http://evil"")"`);
  expect(csvCell('+919876543210')).toBe(`"'+919876543210"`);
});
