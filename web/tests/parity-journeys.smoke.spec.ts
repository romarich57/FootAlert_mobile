import { expect, test } from '@playwright/test';

const routes: Array<{ path: string; heading: string; expectedEndpointPrefix: string }> = [
  { path: '/matches', heading: 'Matches', expectedEndpointPrefix: '/v1/matches' },
  { path: '/teams', heading: 'Teams', expectedEndpointPrefix: '/v1/teams' },
  { path: '/players', heading: 'Players', expectedEndpointPrefix: '/v1/players' },
  { path: '/competitions', heading: 'Competitions', expectedEndpointPrefix: '/v1/competitions' },
  { path: '/search', heading: 'Search', expectedEndpointPrefix: '/v1/follows/search' },
  { path: '/follows', heading: 'Follows', expectedEndpointPrefix: '/v1/follows/trends' },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/**', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        response: [],
      }),
    });
  });
});

for (const routeSpec of routes) {
  test(`parity journey route smoke: ${routeSpec.path}`, async ({ page }) => {
    const requestedApiPaths: string[] = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.startsWith('/v1/')) {
        requestedApiPaths.push(url.pathname);
      }
    });

    await page.goto(routeSpec.path);
    await expect(page.getByRole('heading', { name: routeSpec.heading, exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${routeSpec.path}$`));
    expect(requestedApiPaths.some(path => path.startsWith(routeSpec.expectedEndpointPrefix))).toBe(true);
  });
}
