import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/matches**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: [
          {
            fixture: {
              id: 1001,
              date: '2026-03-04T20:00:00+00:00',
              status: { short: 'FT' },
            },
            league: { name: 'Ligue 1' },
            teams: {
              home: { name: 'PSG' },
              away: { name: 'OM' },
            },
            goals: { home: 2, away: 1 },
          },
        ],
      }),
    });
  });
});

test('navigates public pages and legal routes', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /vitrine officielle/i })).toBeVisible();

  await page.getByLabel('Navigation principale').getByRole('link', { name: 'Tutoriels' }).click();
  await expect(page).toHaveURL(/\/tutorials$/);

  await page.getByLabel('Navigation principale').getByRole('link', { name: 'Scores' }).click();
  await expect(page).toHaveURL(/\/scores$/);
  await expect(page.getByLabel(/PSG contre OM/i)).toBeVisible();

  await page.goto('/legal/privacy');
  await expect(page.getByRole('heading', { name: /Politique de confidentialité/i })).toBeVisible();

  await page.goto('/legal/terms');
  await expect(page.getByRole('heading', { name: /Conditions d'utilisation/i })).toBeVisible();
});
