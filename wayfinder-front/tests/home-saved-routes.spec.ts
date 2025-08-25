import { test, expect } from '@playwright/test';

test.describe('Home – Gespeicherte Routen', () => {
  test('zeigt gespeicherte Routen (mocked backend)', async ({ page }) => {
    // Stabiler userId im localStorage
    const userId = 'e2e-user-1';
    await page.addInitScript(id => localStorage.setItem('wayfinderUserId', id), userId);

    // Mock: GET /routes?userId=...
    await page.route('**/routes?**', route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('userId') === userId) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'r1', userId, name: 'Berlin → Hamburg', startLat:0,startLng:0,endLat:0,endLng:0, geometry:null, createdAt: new Date().toISOString() },
            { id: 'r2', userId, name: 'Zürich → Bern',   startLat:0,startLng:0,endLat:0,endLng:0, geometry:null, createdAt: new Date().toISOString() },
          ]),
        });
      }
      return route.fallback();
    });

    await page.goto('/');

    // Tab öffnen
    await page.getByRole('tab', { name: 'Gespeicherte Routen' }).click();

    // Liste prüfen
    const list = page.getByTestId('saved-routes-list');
    await expect(list).toContainText('Berlin → Hamburg');
    await expect(list).toContainText('Zürich → Bern');
  });
});
