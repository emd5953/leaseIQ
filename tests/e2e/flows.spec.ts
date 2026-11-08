import { test, expect, Page } from '@playwright/test';
const backend = 'http://127.0.0.1:3101';
const pdf = {
  name: 'fixture.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\nControlled fixture\n%%EOF'),
};
const png = {
  name: 'fixture.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9x8AAAAASUVORK5CYII=',
    'base64',
  ),
};
test.beforeEach(async ({ page, request }) => {
  await request.post(backend + '/__fixtures/reset');
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    if (url.hostname === 'accounts.google.com' && url.pathname === '/gsi/client')
      return route.fulfill({
        contentType: 'application/javascript',
        body: `window.google={accounts:{oauth2:{initCodeClient:function(options){return{requestCode:function(){options.callback({code:'fixture-google-code'})}}}},id:{initialize:function(){},renderButton:function(){},prompt:function(){}}}};`,
      });
    return route.abort();
  });
});
async function login(page: Page) {
  await page.goto('/');
  if (await page.getByRole('button', { name: 'Toggle menu' }).isVisible())
    await page.getByRole('button', { name: 'Toggle menu' }).click();
  await page.getByRole('button', { name: /^Sign In(?: with Google)?$/ }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('leaseiq_token'))).toBeTruthy();
}
async function research(page: Page, street = '100 Fixture Street') {
  await page.getByRole('combobox', { name: 'Street address' }).fill(street);
  await expect(page.getByRole('listbox', { name: 'HPD address candidates' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Street address' }).press('ArrowDown');
  await page.getByRole('combobox', { name: 'Street address' }).press('Enter');
  await page.getByRole('checkbox', { name: /I confirm/ }).check();
  await page.getByRole('button', { name: 'Research property', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Property research report' })).toContainText(
    'controlled browser fixture',
  );
}
test('address → confirmed report → persistent comparison, including keyboard selection', async ({
  page,
}) => {
  await page.goto('/research');
  await research(page);
  await page.getByRole('button', { name: 'Add to comparison', exact: true }).click();
  await research(page, '200 Fixture Avenue');
  await page.getByRole('button', { name: 'Add to comparison', exact: true }).click();
  const comparison = page.getByRole('region', { name: 'Property comparison' });
  await expect(comparison).toContainText('100 FIXTURE STREET');
  await expect(comparison).toContainText('200 FIXTURE AVENUE');
  await page.reload();
  await expect(comparison).toContainText('100 FIXTURE STREET');
  await expect(comparison).toContainText('200 FIXTURE AVENUE');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('account history and comparison persist, sharing is opt-in and revocable', async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto('/research');
  await research(page);
  await expect(page.getByRole('status')).toContainText(['Report saved to your account.']);
  await page.getByRole('button', { name: 'Add to comparison', exact: true }).click();
  await page.getByRole('button', { name: 'Create share link', exact: true }).click();
  const url = await page.getByRole('textbox', { name: 'Share link', exact: true }).inputValue();
  const token = url.split('/').pop();
  const shared = await request.get(`${backend}/api/research-library/shared/${token}`);
  expect(shared.status()).toBe(200);
  expect((await shared.json()).report.sources[0].datasetUpdatedAt).toContain('2026-09-20');
  const viewer = await page.context().newPage();
  await viewer.goto(url);
  await expect(viewer.getByRole('article', { name: 'Property research report' })).toBeVisible();
  await viewer.close();
  await page.getByRole('button', { name: 'Revoke sharing', exact: true }).click();
  await expect(page.getByText('Sharing revoked. Previous links no longer work.')).toBeVisible();
  expect((await request.get(`${backend}/api/research-library/shared/${token}`)).status()).toBe(404);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Property comparison' })).toContainText(
    '100 FIXTURE STREET',
  );
  await page
    .getByRole('region', { name: 'Research history' })
    .getByRole('button', { name: /100 FIXTURE STREET/ })
    .click();
  await expect(page.getByRole('article', { name: 'Property research report' })).toBeVisible();
});
test('sign-in → saved listing → tracker, with failed save and server reconciliation', async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto('/search');
  await page.getByRole('button', { name: 'Save 100 Fixture Street', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unsave 100 Fixture Street', exact: true }),
  ).toBeVisible();
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'My Apartment', exact: true }).click();
  await request.post(backend + '/__fixtures/settings', { data: { trackerFailures: 1 } });
  await page.getByRole('combobox', { name: /Move 100 Fixture Street/ }).selectOption('touring');
  await expect(page.getByRole('main').getByRole('alert')).toContainText('was not confirmed');
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(page.getByRole('combobox', { name: /Move 100 Fixture Street/ })).toHaveValue(
    'touring',
  );
  await page.reload();
  await page.getByRole('button', { name: 'My Apartment', exact: true }).click();
  await expect(page.getByRole('combobox', { name: /Move 100 Fixture Street/ })).toHaveValue(
    'touring',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
for (const kind of ['lease', 'floor', 'combined'])
  test(`upload → ${kind} analysis uses an authenticated request`, async ({ page }) => {
    await login(page);
    await page.goto('/lease-analyzer');
    if (kind !== 'floor') await page.getByLabel('Lease PDF', { exact: true }).setInputFiles(pdf);
    if (kind !== 'lease')
      await page.getByLabel('Floor plan image', { exact: true }).setInputFiles(png);
    const request = page.waitForRequest((r) => r.url().endsWith('/api/property/analyze'));
    await page
      .getByRole('button', { name: kind === 'combined' ? 'Analyze Both' : 'Analyze', exact: true })
      .click();
    expect((await request).headers().authorization).toMatch(/^Bearer /);
    if (kind !== 'floor')
      await expect(page.getByText('Controlled lease fixture summary')).toBeVisible();
    if (kind !== 'lease')
      await expect(page.getByText('Controlled floor plan fixture summary')).toBeVisible();
    await expect(page.getByText(/Email provider accepted/)).toHaveCount(0);
  });
test('partial analysis retries only the failed file; email failure is explicit', async ({
  page,
  request,
}) => {
  await login(page);
  await page.goto('/lease-analyzer');
  await request.post(backend + '/__fixtures/settings', { data: { floorFails: true } });
  await page.getByLabel('Lease PDF', { exact: true }).setInputFiles(pdf);
  await page.getByLabel('Floor plan image', { exact: true }).setInputFiles(png);
  await page.getByRole('button', { name: 'Analyze Both', exact: true }).click();
  await expect(page.getByText('Controlled lease fixture summary')).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Partial analysis');
  await request.post(backend + '/__fixtures/settings', { data: { floorFails: false } });
  await page.getByRole('button', { name: 'Retry failed analysis', exact: true }).click();
  await expect(page.getByText('Controlled floor plan fixture summary')).toBeVisible();
  await page.goto('/lease-analyzer');
  await request.post(backend + '/__fixtures/settings', { data: { emailFails: true } });
  await page.getByLabel('Lease PDF', { exact: true }).setInputFiles(pdf);
  await page.getByRole('checkbox', { name: /Email a copy/ }).check();
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Email not confirmed');
  await expect(page.getByText(/Email provider accepted/)).toHaveCount(0);
  await request.post(backend + '/__fixtures/settings', { data: { emailFails: false } });
  await page.getByRole('button', { name: 'Retry email', exact: true }).click();
  await expect(page.getByText(/Email provider accepted/)).toBeVisible();
});
test('anonymous upload guard and expired sessions are clear', async ({ page }) => {
  await page.goto('/lease-analyzer');
  await expect(page.getByText(/Sign in before uploading documents/)).toBeVisible();
  await expect(page.getByLabel('Lease PDF', { exact: true })).toBeDisabled();
  await login(page);
  await page.goto('/lease-analyzer');
  await page.getByLabel('Lease PDF', { exact: true }).setInputFiles(pdf);
  await page.evaluate(() => localStorage.setItem('leaseiq_token', 'expired-fixture-token'));
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  await expect(page.getByText(/Your session expired/).first()).toBeVisible();
  await expect(page.getByText(/Sign in before uploading documents/)).toBeVisible();
});
test('unmatched addresses and partial source coverage remain explicit and recoverable', async ({
  page,
  request,
}) => {
  await page.goto('/research');
  await page.getByRole('combobox', { name: 'Street address' }).fill('999999 Unmatched Street');
  await page.getByRole('button', { name: 'Research property', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Confirm the address before relying on building records' }),
  ).toBeVisible();
  await expect(page.getByRole('article', { name: 'Property research report' })).not.toContainText(
    'Controlled fixture violation',
  );
  await request.post(backend + '/__fixtures/settings', { data: { sourceUnavailable: true } });
  await research(page);
  await expect(page.getByText(/Partial source coverage:/)).toBeVisible();
  await expect(page.getByRole('article', { name: 'Property research report' })).toContainText(
    'Controlled fixture violation',
  );
  await request.post(backend + '/__fixtures/settings', { data: { sourceUnavailable: false } });
  await page.getByRole('button', { name: 'Retry sources with a fresh lookup' }).click();
  await expect(page.getByText(/Partial source coverage:/)).toHaveCount(0);
});
