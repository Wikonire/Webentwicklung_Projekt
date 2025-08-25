import { test, expect } from '@playwright/test';

test.describe('Home – Top 10', () => {
  test('Suche zählt in Top 10 und erscheint im Tab', async ({ page }) => {
    await page.goto('/');

    // Route 1x suchen
    await page.locator('#startControl').fill('Zürich');
    await page.locator('#endControl').fill('Bern');
    await page.getByTestId('route-button').click();

    // Top 10 Tab öffnen
    await page.getByRole('tab', { name: 'Top 10 der letzten Routen' }).click();

    // Eintrag sichtbar
    await expect(page.getByTestId('top-routes-list')).toContainText(/Zürich\s*→\s*Bern/i);
  });

  test('Persistenz über Reload (localStorage)', async ({ page }) => {
    await page.goto('/');

    // einmal suchen
    await page.locator('#startControl').fill('Basel');
    await page.locator('#endControl').fill('Luzern');
    await page.getByTestId('route-button').click();

    // Reload
    await page.reload();

    // Tab öffnen, Persistenz prüfen
    await page.getByRole('tab', { name: 'Top 10 der letzten Routen' }).click();
    await expect(page.getByTestId('top-routes-list')).toContainText(/Basel\s*→\s*Luzern/i);
  });
});
