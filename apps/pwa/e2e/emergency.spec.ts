import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('Emergency SOS', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockApi(page);
  });

  test('SOS senden und Ack', async ({ page }) => {
    await page.goto('/emergency');
    await expect(page.getByRole('heading', { name: 'Acil Durum' })).toBeVisible();

    await page.getByRole('button', { name: 'SOS' }).click();
    await page.locator('select[name="type"]').selectOption('FIRE');
    await page.locator('input[name="title"]').fill('Feuer Block A');
    await page.locator('textarea[name="message"]').fill('Rauch im Treppenhaus');
    await page.getByRole('button', { name: 'Jetzt senden' }).click();

    await expect(page.locator('article.alert')).toContainText('Feuer Block A');
    await page.getByRole('button', { name: 'Güvendeyim' }).click();
    await expect(page.getByText('Dein Status: SAFE')).toBeVisible();
  });
});
