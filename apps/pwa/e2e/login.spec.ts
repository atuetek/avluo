import { test, expect } from '@playwright/test';
import { clearSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('Login OTP', () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
    await mockApi(page);
  });

  test('OTP-Flow leitet zur Timeline', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Giriş' })).toBeVisible();

    await page.getByRole('button', { name: 'Kod gönder' }).click();
    await expect(page.getByText('Dev OTP: 123456')).toBeVisible();

    await page.locator('input[name="code"]').fill('123456');
    await page.getByRole('button', { name: 'Doğrula' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: 'Akış' })).toBeVisible();
  });

  test('ungültiger OTP zeigt Fehler', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Kod gönder' }).click();
    await page.locator('input[name="code"]').fill('000000');
    await page.getByRole('button', { name: 'Doğrula' }).click();
    await expect(page.locator('.error')).toBeVisible();
  });

  test('ohne Session Redirect zu Login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
