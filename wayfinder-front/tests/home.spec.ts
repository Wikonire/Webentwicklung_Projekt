import { test, expect } from '@playwright/test';

  test.describe('HomeComponent Acceptance-Tests', () => {


    test('should show suggestions when typing in start input', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForLoadState('load');
      // API-Mock für Autocomplete
      await page.route('**/geocode/autocomplete**', async route => {
        const json = [
          { id: 'bern', label: 'Bern, Switzerland', coordinates: [7.4474, 46.9481] },
          { id: 'zuerich', label: 'Zürich, Switzerland', coordinates: [8.5417, 47.3769] }
        ];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(json) });

        await page.getByTestId('start-input').fill('Ber');
        await expect(page.getByTestId('start-option-bern')).toBeVisible();
      });
    });

    test('should show suggestions when typing in destination input', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForLoadState('load');

      await page.route('**/geocode/autocomplete**', async route => {
        const json = [
          { id: 'basel', label: 'Basel, Switzerland', coordinates: [7.5886, 47.5596] },
          { id: 'luzern', label: 'Luzern, Switzerland', coordinates: [8.308, 47.0502] }
        ];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(json) });
      });

      await page.getByTestId('destination-input').fill('Bas');
      await expect(page.getByTestId('destination-option-basel')).toBeVisible();
    });

    test('should calculate route and display map + meta info', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForLoadState('load');

      // Mock für Directions
      await page.route('**/v2/directions/**', async route => {
        const json = [{
          distance: 85000,
          duration: 5400,
          profile: 'driving-car',
          startLabel: 'Bern',
          destinationLabel: 'Zürich',
          geometry: {}
        },
          {
            "id": "f64ac5fd-45dd-4846-9bb9-15a92de3b90e",
            "userId": "u1",
            "startLabel": "Aeschiweg/Feldackerweg, Boll, BE, Switzerland",
            "destinationLabel": "Regenbogenhaus Zürich, Zurich, Switzerland",
            "startCoord": [
              7.541541,
              46.959191
            ],
            "destinationCoord": [
              8.52994,
              47.381498
            ],
            "profile": "driving-car",
            "distance": 125718.2,
            "duration": 5500.6,
            "geometry": {
              "type": "FeatureCollection",
              "features": [
                {
                  "type": "Feature",
                  "geometry": {
                    "type": "LineString",
                    "coordinates": [
                      [
                        7.54154,
                        46.95922
                      ],
                      [
                        7.54131,
                        46.95923
                      ],
                      [
                        7.85051,
                        47.31152
                      ],
                      [
                        7.85133,
                        47.31168
                      ],
                      [
                        7.85293,
                        47.31193
                      ],
                      [
                        7.85409,
                        47.31207
                      ],
                      [
                        7.85523,
                        47.31216
                      ],
                      [
                        7.85644,
                        47.31219
                      ],
                      [
                        8.52972,
                        47.38176
                      ],
                      [
                        8.52993,
                        47.3817
                      ],
                      [
                        8.53005,
                        47.38167
                      ]
                    ]
                  },
                  "properties": {
                    "summary": {
                      "distance": 125718.2,
                      "duration": 5500.6
                    }
                  }
                }
              ]
            },
            "createdAt": "2025-09-13 21:53:24"
          },
          {
            "id": "dccbd0d8-c495-4f4f-9aa9-7858dcb2a060",
            "userId": "u1",
            "startLabel": "Boll-Utzigen Bahnhof, Boll, BE, Switzerland",
            "destinationLabel": "Aeschiweg/Feldackerweg, Boll, BE, Switzerland",
            "startCoord": [
              7.546402,
              46.953159
            ],
            "destinationCoord": [
              7.541541,
              46.959191
            ],
            "profile": "wheelchair",
            "distance": 1364.5,
            "duration": 1007.4,
            "geometry": {
              "type": "FeatureCollection",
              "features": [
                {
                  "type": "Feature",
                  "geometry": {
                    "type": "LineString",
                    "coordinates": [
                      [
                        7.54641,
                        46.95311
                      ],
                      [
                        7.54619,
                        46.95309
                      ],
                      [
                        7.54579,
                        46.95303
                      ],
                      [
                        7.54107,
                        46.95924
                      ],
                      [
                        7.54131,
                        46.95923
                      ],
                      [
                        7.54154,
                        46.95922
                      ]
                    ]
                  },
                  "properties": {
                    "summary": {
                      "distance": 1364.5,
                      "duration": 1007.4
                    }
                  }
                }
              ]
            },
            "createdAt": "2025-09-13 21:55:22"
          },
          {
            "id": "3e03e005-2fed-43a0-847d-0e76817d1093",
            "userId": "u1",
            "startLabel": "Regenbogenhaus Zürich, Zurich, Switzerland",
            "destinationLabel": "Aeschiweg/Feldackerweg, Boll, BE, Switzerland",
            "startCoord": [
              8.52994,
              47.381498
            ],
            "destinationCoord": [
              7.541541,
              46.959191
            ],
            "profile": "driving-car",
            "distance": 122048,
            "duration": 5665.7,
            "geometry": {
              "type": "FeatureCollection",
              "features": [
                {
                  "type": "Feature",
                  "geometry": {
                    "type": "LineString",
                    "coordinates": [
                      [
                        8.53005,
                        47.38167
                      ],
                      [
                        8.53074,
                        47.38146
                      ],
                      [
                        8.53105,
                        47.3818
                      ],
                      [
                        7.53686,
                        47.0423
                      ],
                      [
                        7.5372,
                        47.04201
                      ],
                      [
                        7.53755,
                        47.04169
                      ],
                      [
                        7.53771,
                        47.04153
                      ],
                      [
                        7.53791,
                        47.04126
                      ],
                      [
                        7.53815,
                        47.04096
                      ],
                      [
                        7.53818,
                        47.04083
                      ],
                      [
                        7.5383,
                        47.04077
                      ],
                      [
                        7.54131,
                        46.95923
                      ],
                      [
                        7.54154,
                        46.95922
                      ]
                    ]
                  },
                  "properties": {
                    "summary": {
                      "distance": 122048,
                      "duration": 5665.7
                    }
                  }
                }
              ]
            },
            "createdAt": "2025-09-13 23:39:17"
          }
        ];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(json) });
      });

      await page.getByTestId('start-input').fill('Bern');
      await page.getByTestId('destination-input').fill('Zürich');
      await page.getByTestId('route-button').click();

      await expect(page.getByTestId('route-label')).toContainText('Bern → Zürich');
      await expect(page.getByTestId('route-distance')).toContainText('km');
      await expect(page.getByTestId('route-duration')).toContainText('min');
    });

    test('should show empty state when no saved routes exist', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForLoadState('load');

      await page.route('**/api/saved-routes**', async route => {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify([]) });
      });

      await page.getByRole('tab', { name: 'Gespeicherte Routen' }).click();
      await expect(page.getByTestId('saved-routes-empty')).toBeVisible();
    });

    test('should list saved routes from backend', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForLoadState('load');

      await page.route('**/api/saved-routes**', async route => {
        const json = [
          { id: 1, start: 'Bern', destination: 'Zürich', profile: 'driving-car' }
        ];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(json) });
      });

      await page.getByRole('tab', { name: 'Gespeicherte Routen' }).click();
      await expect(page.getByTestId('saved-route-item-1')).toContainText('Bern → Zürich');
    });

    test('should list top routes and allow saving one', async ({ page }) => {
      await page.goto('http://localhost:4200/');
      await page.waitForLoadState('load');

      await page.route('**/api/top-routes**', async route => {
        const json = [
          { id: 101, start: 'Basel', destination: 'Genf', profile: 'cycling-regular' }
        ];
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(json) });
      });

      await page.getByRole('tab', { name: 'Top 10 der letzten Routen' }).click();
      const item = page.getByTestId('top-route-item-101');
      await expect(item).toContainText('Basel → Genf');

      const saveBtn = page.getByTestId('save-top-route-101');
      await saveBtn.click();
      // hier kannst du z. B. erwarten, dass ein Snackbar erscheint
    });

  });

