import { test, expect } from '@playwright/test';

test.describe('Routensuche', () => {
  test('Start- und Zielort eingeben und Route anzeigen', async ({ page }) => {
    // App öffnen
    await page.goto('/');

    // Eingabefelder ausfüllen
    await page.getByLabel('Startort').fill('Berlin');
    await page.getByLabel('Zielort').fill('Hamburg');

    // Klick auf den Button
    await page.getByRole('button', { name: /Route berechnen/i }).click();

    // Erwartung: Spinner/Loading sichtbar
    await expect(page.getByRole('progressbar')).toBeVisible();

    // Erwartung: Karte zeigt Route (z. B. durch ein Element mit data-testid)
    await expect(page.getByTestId('map')).toBeVisible();

    // Erwartung: Die Route-Liste zeigt Ergebnisse
    await expect(page.getByRole('list')).toContainText('Berlin');
    await expect(page.getByRole('list')).toContainText('Hamburg');
  });
});
