import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://challenges.cloudflare.com/**', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: '' }),
  );
});

test('the enrollment form asks for name, phone, email and consent', async ({ page }) => {
  await page.goto('/enroll/');
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Phone', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox')).toBeVisible();
  // The spam-trap field must not be reachable by people.
  await expect(page.locator('input[name="website"]')).not.toBeInViewport();
});

test('a submission posts to /api/enroll and lands on the thank-you page', async ({ page }) => {
  let posted = '';
  await page.route('**/api/enroll', (route) => {
    posted = route.request().postData() ?? '';
    return route.fulfill({ status: 303, headers: { location: '/thank-you/' } });
  });

  await page.goto('/enroll/');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Asha Rao');
  await page.getByRole('textbox', { name: 'Phone', exact: true }).fill('+91 98765 43210');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('asha@example.com');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Send enrollment' }).click();

  await expect(page).toHaveURL(/\/thank-you\/$/);
  expect(posted).toContain('name=Asha+Rao');
  expect(posted).toContain('email=asha%40example.com');
});

test('the browser blocks an incomplete form', async ({ page }) => {
  let called = false;
  await page.route('**/api/enroll', (route) => ((called = true), route.abort()));
  await page.goto('/enroll/');
  await page.getByRole('button', { name: 'Send enrollment' }).click();
  await expect(page).toHaveURL(/\/enroll\/$/);
  expect(called).toBe(false);
});

test('shows a friendly message when the server rejects the form', async ({ page }) => {
  await page.goto('/enroll/?error=captcha');
  await expect(page.getByRole('alert')).toContainText('confirm you are human');
  await page.goto('/enroll/?error=%3Cimg%20src%3Dx%3E');
  await expect(page.getByRole('alert')).toBeHidden();
});
