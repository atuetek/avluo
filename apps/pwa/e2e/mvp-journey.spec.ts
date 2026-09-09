import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('MVP Journey', () => {
  test('Nav zu allen Kernseiten', async ({ page }) => {
    await seedSession(page, { admin: true });
    await mockApi(page);
    await page.goto('/');

    const stops: { link: string; assert: RegExp | string }[] = [
      { link: 'Mesajlar', assert: /\/messages/ },
      { link: 'Etkinlikler', assert: /\/events/ },
      { link: 'Üyeler', assert: /\/members/ },
      { link: 'Acil', assert: /\/emergency/ },
      { link: 'Profil', assert: /\/profile/ },
      { link: 'Yönetim', assert: /\/yonetim/ },
      { link: 'Akış', assert: /\/$/ },
    ];

    for (const stop of stops) {
      await page.getByRole('link', { name: stop.link }).click();
      await expect(page).toHaveURL(stop.assert);
    }

    await page.locator('a.bell').click();
    await expect(page).toHaveURL(/\/notifications/);
  });
});
