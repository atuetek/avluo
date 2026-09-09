import { test, expect } from '@playwright/test';
import { seedSession } from './helpers/session';
import { mockApi } from './helpers/api-mock';

test.describe('Admin & Notifications', () => {
  test('Admin sieht Yönetim und legt Invite an', async ({ page }) => {
    await seedSession(page, { admin: true });
    await mockApi(page);
    await page.goto('/yonetim');

    await expect(page.getByRole('heading', { name: 'Yönetim' })).toBeVisible();
    await expect(page.getByText('Ayşe Yılmaz')).toBeVisible();

    await page.getByRole('button', { name: 'Invites' }).click();
    await page.locator('input[name="inviteHouse"]').fill('C-9');
    await page.getByRole('button', { name: 'Invite anlegen' }).click();
    await expect(page.locator('code')).toContainText('YSL-E2E01');

    await page.getByRole('button', { name: 'Audit' }).click();
    await expect(page.getByText('admin.invite.create')).toBeVisible();
  });

  test('Member sieht kein Admin-Nav', async ({ page }) => {
    await seedSession(page);
    await mockApi(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Yönetim' })).toHaveCount(0);
  });

  test('Benachrichtigungen markieren', async ({ page }) => {
    await seedSession(page);
    await mockApi(page);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Benachrichtigungen' })).toBeVisible();
    await expect(page.locator('article.unread')).toContainText('Neuer Like');
    await page.getByRole('button', { name: 'Alle gelesen' }).click();
    await expect(page.locator('article.unread')).toHaveCount(0);
  });
});
