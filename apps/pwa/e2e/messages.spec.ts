import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('Messages & Members', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockApi(page);
  });

  test('Mitglied suchen und DM senden', async ({ page }) => {
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'Mitglieder' })).toBeVisible();

    await page.locator('input[name="q"]').fill('Mehmet');
    await page.getByRole('button', { name: 'Suchen' }).click();
    await expect(page.getByText('Mehmet Demir')).toBeVisible();

    await page.getByRole('button', { name: 'Nachricht' }).click();
    await expect(page).toHaveURL(/\/messages/);

    await page.locator('input[name="draft"]').fill('Merhaba Mehmet');
    await page.getByRole('button', { name: 'Senden' }).click();
    await expect(page.locator('.bubble')).toContainText('Merhaba Mehmet');
  });

  test('Nachrichten-Nav erreichbar', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('heading', { name: 'Nachrichten' })).toBeVisible();
  });
});
