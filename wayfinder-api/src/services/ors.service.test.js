jest.mock('node-fetch', () => jest.fn());
jest.mock('../config', () => ({
    ORS_BASE: 'https://api.openrouteservice.org',
    ORS_API_KEY: 'test-key',
}));

const fetch = require('node-fetch');
const { autocomplete, geocode, directions } = require('./ors.service');

const makeRes = (status, bodyString) => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => bodyString,
});

describe('ors.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('autocomplete: GET /geocode/autocomplete?text=Bas, Authorization header gesetzt', async () => {
        const payload = { features: [{ properties: { label: 'Basel, CH' } }] };
        fetch.mockResolvedValueOnce(makeRes(200, JSON.stringify(payload)));

        const r = await autocomplete('Bas');

        expect(fetch).toHaveBeenCalledTimes(1);
        const [calledUrl, calledInit] = fetch.mock.calls[0];

        expect(String(calledUrl)).toBe('https://api.openrouteservice.org/geocode/autocomplete?text=Bas');
        expect(calledInit.method).toBe('GET');
        expect(calledInit.headers.Authorization).toBe('test-key');

        expect(r.ok).toBe(true);
        expect(r.status).toBe(200);
        expect(r.data).toEqual(payload);
    });

    test('geocode: GET /geocode/search?text=Basel', async () => {
        const payload = { features: [{ properties: { name: 'Basel' } }] };
        fetch.mockResolvedValueOnce(makeRes(200, JSON.stringify(payload)));

        const r = await geocode('Basel');

        const [calledUrl] = fetch.mock.calls[0];
        expect(String(calledUrl)).toBe('https://api.openrouteservice.org/geocode/search?text=Basel');
        expect(r.ok).toBe(true);
        expect(r.data.features[0].properties.name).toBe('Basel');
    });

    test('geocode: Query wird URL-encodiert (Umlaute)', async () => {
        fetch.mockResolvedValueOnce(makeRes(200, JSON.stringify({})));

        await geocode('Zürich');

        const [calledUrl] = fetch.mock.calls[0];
        expect(String(calledUrl)).toBe('https://api.openrouteservice.org/geocode/search?text=Z%C3%BCrich');
    });

    test('directions: POST /v2/directions/driving-car mit Body & Content-Type', async () => {
        const routes = {
            routes: [{
                geometry: { type: 'LineString', coordinates: [[7.59, 47.56], [8.31, 47.05]] },
                summary: { distance: 100000, duration: 3600 }
            }]
        };
        fetch.mockResolvedValueOnce(makeRes(200, JSON.stringify(routes)));

        const start = [7.59, 47.56];
        const end = [8.31, 47.05];
        const r = await directions('driving-car', start, end);

        const [calledUrl, init] = fetch.mock.calls[0];
        expect(String(calledUrl)).toBe('https://api.openrouteservice.org/v2/directions/driving-car');
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe('test-key');
        expect(init.headers['Content-Type']).toBe('application/json');

        const sentBody = JSON.parse(init.body);
        expect(sentBody.coordinates).toEqual([start, end]);
        expect(sentBody.geometry_format).toBe('geojson');
        expect(sentBody.instructions).toBe(false);

        expect(r.ok).toBe(true);
        expect(r.status).toBe(200);
        expect(r.data).toEqual(routes);
    });

    test('directions: anderes Profil wird korrekt in URL eingesetzt', async () => {
        fetch.mockResolvedValueOnce(makeRes(200, JSON.stringify({ routes: [] })));
        await directions('cycling-regular', [0, 0], [1, 1]);
        const [calledUrl] = fetch.mock.calls[0];
        expect(String(calledUrl)).toBe('https://api.openrouteservice.org/v2/directions/cycling-regular');
    });

    test('Upstream-Fehler (403) -> ok=false, status=403, data=Text', async () => {
        fetch.mockResolvedValueOnce(makeRes(403, 'Forbidden'));
        const r = await geocode('Basel');
        expect(r.ok).toBe(false);
        expect(r.status).toBe(403);
        expect(r.data).toBe('Forbidden');
    });

    test('Ungültiges JSON (Text) -> Parser-Fallback liefert Text zurück', async () => {
        fetch.mockResolvedValueOnce(makeRes(500, 'Internal Oops'));
        const r = await autocomplete('Bas');
        expect(r.ok).toBe(false);
        expect(r.status).toBe(500);
        expect(r.data).toBe('Internal Oops');
    });
});
