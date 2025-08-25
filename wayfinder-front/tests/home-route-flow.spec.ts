import { test, expect } from '@playwright/test';

test.describe('Home – Route Flow', () => {
  test('Start/Ziel eingeben → Map zeigt Route', async ({ page }) => {
    await page.goto('/');

    // Eingaben
    await page.locator('#startControl').fill('Berlin');
    await page.locator('#endControl').fill('Hamburg');

    // Button klicken
    const routeBtn = page.getByTestId('route-button');
    await expect(routeBtn).toBeEnabled();
    await routeBtn.click();

    // Karte + Route sichtbar (Map zeichnet nach deinem Component-Contract)
    await expect(page.getByTestId('map')).toBeVisible();
    await expect(page.getByTestId('route-polyline')).toContainText(/Berlin\s*→\s*Hamburg/i);
  });
});
