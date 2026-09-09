import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockApi(page);
  });

  test('Post erstellen, liken, kommentieren', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Henüz gönderi yok.')).toBeVisible();

    await page.locator('textarea[name="draft"]').fill('Merhaba Yeşiltepe E2E');
    await page.getByRole('button', { name: 'Paylaş' }).click();

    await expect(page.locator('article.post')).toContainText('Merhaba Yeşiltepe E2E');
    await expect(page.getByText('Ayşe Yılmaz')).toBeVisible();

    await page.locator('article.post footer button').first().click();
    await expect(page.locator('article.post footer')).toContainText('♥ 1');

    await page.locator('article.post footer button').nth(1).click();
    await page.getByPlaceholder('Kommentar…').fill('Selam!');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('.comment')).toContainText('Selam!');
  });
});
