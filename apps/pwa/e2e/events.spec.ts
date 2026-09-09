import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('Events', () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);
    await mockApi(page);
  });

  test('Event anlegen und RSVP', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Veranstaltungen' })).toBeVisible();

    await page.locator('input[name="title"]').fill('Nachbarschaftsfest');
    await page.locator('textarea[name="description"]').fill('Im Hof');
    await page.locator('input[name="location"]').fill('Innenhof');
    await page.locator('input[name="startsAt"]').fill('2030-06-15T18:00');
    await page.getByRole('button', { name: 'Anlegen' }).click();

    await expect(page.locator('article.card')).toContainText('Nachbarschaftsfest');
    await page.getByRole('button', { name: 'Komme' }).click();
    await expect(page.locator('.rsvp button.active')).toContainText('Komme');
  });
});
