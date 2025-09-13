import express from 'express';
import request from 'supertest';
import polyline from '@mapbox/polyline';
import { jest } from '@jest/globals';

// --- Mocks ---
// RateLimiter immer durchlassen
await jest.unstable_mockModule('express-rate-limit', () => ({
    default: () => (req, res, next) => next(),
}));

// ORS-Service mocken
await jest.unstable_mockModule('../services/ors.service.js', () => ({
    autocomplete: jest.fn(),
    geocode: jest.fn(),
    directions: jest.fn(),
    sendUpstreamError: jest.fn((up, res) =>
        res.status(up.status).json({ error: up.data || 'Upstream error' })
    ),
}));

// Jetzt gemockte Funktionen importieren
const { autocomplete, geocode, directions, sendUpstreamError } = await import('../services/ors.service.js');

// Danach den Router und Hilfsfunktionen importieren (nutzt schon die gemockten Services)
const {
    mapFeatureToSuggestion,
    prepareQueryToOrs,
    sendSuggestionResponse,
    validateLayers,
    router,
} = await import('./ors.routes.js');

// Hilfsfunktion zum App-Bauen
const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/ors', router);
    return app;
};

describe('ors.routes', () => {
    describe('Hilfsfunktionen', () => {
        describe('mapFeatureToSuggestion', () => {
            test('wandelt ein komplettes Feature korrekt um', () => {
                const result = mapFeatureToSuggestion({
                    properties: { id: '1', label: 'Zürich' },
                    geometry: { coordinates: [8.55, 47.37] },
                });
                expect(result).toEqual({ id: '1', label: 'Zürich', coord: [8.55, 47.37] });
            });

            test('setzt id auf null wenn fehlt', () => {
                const result = mapFeatureToSuggestion({
                    properties: { label: 'Bern' },
                    geometry: { coordinates: [7, 47] },
                });
                expect(result.id).toBeNull();
            });

            test('setzt label auf Unbekannt wenn fehlt', () => {
                const result = mapFeatureToSuggestion({
                    properties: { id: '42' },
                    geometry: { coordinates: [7, 47] },
                });
                expect(result.label).toBe('Unbekannt');
            });

            test('liefert NaN-Koordinaten wenn geometry fehlt', () => {
                const result = mapFeatureToSuggestion({ properties: { id: 'x' }, geometry: {} });
                expect(result.coord[0]).toBeNaN();
                expect(result.coord[1]).toBeNaN();
            });
        });

        describe('prepareQueryToOrs', () => {
            let req;
            beforeEach(() => {
                req = { query: {} };
            });

            test('setzt defaultLayers wenn keine übergeben', () => {
                const result = prepareQueryToOrs({}, req);
                expect(result.layers).toContain('address');
            });

            test('übernimmt gültige Layers', () => {
                req.query.layers = 'locality';
                const result = prepareQueryToOrs({}, req);
                expect(result.layers).toBe('locality');
            });

            test('wirft Fehler bei ungültigen Layers', () => {
                req.query.layers = 'foo';
                expect(() => prepareQueryToOrs({}, req)).toThrow(/Ungültiger Layer/);
            });

            test('setzt size default wenn fehlt', () => {
                const result = prepareQueryToOrs({}, req, 5);
                expect(result.size).toBe(5);
            });

            test('klammert size zwischen 1 und 30', () => {
                req.query.size = '100';
                expect(prepareQueryToOrs({}, req).size).toBe(30);
                req.query.size = '-1';
                expect(prepareQueryToOrs({}, req).size).toBe(1);
            });

            test('fügt lang und country hinzu', () => {
                req.query.lang = 'de';
                req.query.country = 'CH';
                const result = prepareQueryToOrs({}, req);
                expect(result.lang).toBe('de');
                expect(result['boundary.country']).toBe('CH');
            });

            test('fügt focus.point hinzu wenn gültig', () => {
                req.query.lat = '47.3';
                req.query.lon = '8.5';
                const result = prepareQueryToOrs({}, req);
                expect(result['focus.point.lat']).toBeCloseTo(47.3);
                expect(result['focus.point.lon']).toBeCloseTo(8.5);
            });

            test('ignoriert focus.point wenn invalide', () => {
                req.query.lat = 'foo';
                req.query.lon = 'bar';
                const result = prepareQueryToOrs({}, req);
                expect(result['focus.point.lat']).toBeUndefined();
            });
        });

        describe('sendSuggestionResponse', () => {
            let res;
            beforeEach(() => {
                res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
            });

            test('ruft sendUpstreamError wenn ok=false', () => {
                sendSuggestionResponse({ ok: false, status: 500, data: 'kaputt' }, res);
                expect(sendUpstreamError).toHaveBeenCalled();
            });

            test('liefert Suggestions bei ok=true', () => {
                sendSuggestionResponse(
                    {
                        ok: true,
                        data: {
                            features: [
                                {
                                    properties: { id: '1', label: 'Bern' },
                                    geometry: { coordinates: [7, 47] },
                                },
                            ],
                        },
                    },
                    res
                );
                expect(res.json).toHaveBeenCalledWith({
                    suggestions: [{ id: '1', label: 'Bern', coord: [7, 47] }],
                });
            });

            test('liefert leeres Array wenn features fehlt', () => {
                sendSuggestionResponse({ ok: true, data: {} }, res);
                expect(res.json).toHaveBeenCalledWith({ suggestions: [] });
            });
        });

        describe('validateLayers', () => {
            test('liefert Fehler bei Nicht-String', () => {
                expect(validateLayers(null)).toMatch(/nicht-leerer String/);
            });
            test('liefert Fehler bei leerem String', () => {
                expect(validateLayers('   ')).toMatch(/nicht-leerer String/);
            });
            test('liefert null bei gültigen Layers', () => {
                expect(validateLayers('address,street')).toBeNull();
            });
            test('liefert Fehler bei ungültigem Layer', () => {
                expect(validateLayers('foo')).toMatch(/Ungültiger Layer/);
            });
        });
    });

    describe('Routes', () => {
        let app;
        beforeAll(() => {
            app = makeApp();
        });
        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe('GET /ors/autocomplete', () => {
            test('liefert 400 wenn query fehlt', async () => {
                const res = await request(app).get('/ors/autocomplete');
                expect(res.status).toBe(400);
            });

            test('liefert Suggestions bei Erfolg', async () => {
                autocomplete.mockResolvedValueOnce({
                    ok: true,
                    data: {
                        features: [
                            {
                                properties: { id: '1', label: 'Bern' },
                                geometry: { coordinates: [7, 47] },
                            },
                        ],
                    },
                });
                const res = await request(app).get('/ors/autocomplete?query=bern');
                expect(res.status).toBe(200);
                expect(res.body.suggestions).toHaveLength(1);
            });
        });

        describe('GET /ors/geocode', () => {
            test('liefert 400 wenn query fehlt', async () => {
                const res = await request(app).get('/ors/geocode');
                expect(res.status).toBe(400);
            });

            test('liefert 200 bei Erfolg', async () => {
                geocode.mockResolvedValueOnce({ ok: true, data: { features: [] } });
                const res = await request(app).get('/ors/geocode?query=bern');
                expect(res.status).toBe(200);
            });
        });

        describe('POST /ors/directions', () => {
            test('liefert Fehler wenn upstreamResponse ok=false mit String', async () => {
                directions.mockResolvedValueOnce({ ok: false, status: 500, data: 'kaputt' });
                const res = await request(app)
                    .post('/ors/directions')
                    .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
                expect(res.status).toBe(500);
                expect(res.body.error).toBe('kaputt');
            });

            test('liefert Fehler wenn upstreamResponse ok=false mit Objekt', async () => {
                directions.mockResolvedValueOnce({ ok: false, status: 502, data: { error: 'bad' } });
                const res = await request(app)
                    .post('/ors/directions')
                    .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
                expect(res.status).toBe(502);
                expect(res.body.error).toBe('bad');
            });

            test('liefert FeatureCollection wenn ORS GeoJSON zurückgibt', async () => {
                directions.mockResolvedValueOnce({
                    ok: true,
                    data: {
                        type: 'FeatureCollection',
                        features: [
                            { properties: { summary: { distance: 1, duration: 2 } } },
                        ],
                    },
                });
                const res = await request(app)
                    .post('/ors/directions')
                    .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
                expect(res.status).toBe(200);
                expect(res.body.distance).toBe(1);
                expect(res.body.duration).toBe(2);
            });

            test('liefert FeatureCollection wenn ORS routes[] zurückgibt', async () => {
                const encoded = polyline.encode([
                    [47.0, 8.0],
                    [47.1, 8.1],
                ]);
                directions.mockResolvedValueOnce({
                    ok: true,
                    data: {
                        routes: [
                            { geometry: encoded, summary: { distance: 3, duration: 4 } },
                        ],
                    },
                });
                const res = await request(app)
                    .post('/ors/directions')
                    .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
                expect(res.status).toBe(200);
                expect(res.body.type).toBe('FeatureCollection');
                expect(res.body.distance).toBe(3);
                expect(res.body.duration).toBe(4);
            });

            test('liefert Fallback FeatureCollection wenn keine Daten', async () => {
                directions.mockResolvedValueOnce({ ok: true, data: {} });
                const res = await request(app)
                    .post('/ors/directions')
                    .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
                expect(res.status).toBe(200);
                expect(res.body.features).toEqual([]);
            });
        });

        test('liefert generisches Upstream error wenn data nicht String/Objekt ist', async () => {
            directions.mockResolvedValueOnce({ ok: false, status: 503, data: 12345 });
            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
            expect(res.status).toBe(503);
            expect(res.body.error).toBe('Upstream error');
        });

        test('liefert FeatureCollection wenn ORS GeoJSON zurückgibt', async () => {
            directions.mockResolvedValueOnce({
                ok: true,
                data: {
                    type: 'FeatureCollection',
                    features: [
                        { properties: { summary: { distance: 10, duration: 20 } } },
                    ],
                },
            });
            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
            expect(res.status).toBe(200);
            expect(res.body.distance).toBe(10);
            expect(res.body.duration).toBe(20);
        });

        test('liefert FeatureCollection aus routes[]', async () => {
            const encoded = polyline.encode([
                [47.0, 8.0],
                [47.1, 8.1],
            ]);
            directions.mockResolvedValueOnce({
                ok: true,
                data: {
                    routes: [
                        {
                            geometry: encoded,
                            summary: { distance: 33, duration: 44 },
                        },
                    ],
                },
            });
            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
            expect(res.status).toBe(200);
            expect(res.body.type).toBe('FeatureCollection');
            expect(res.body.distance).toBe(33);
            expect(res.body.duration).toBe(44);
            expect(res.body.features[0].geometry.type).toBe('LineString');
        });

        test('liefert Fallback FeatureCollection wenn keine Daten vorhanden', async () => {
            directions.mockResolvedValueOnce({ ok: true, data: {} });
            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [7, 47], end: [8, 47], profile: 'driving-car' });
            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                type: 'FeatureCollection',
                features: [],
                distance: 0,
                duration: 0,
            });
        });
    });
});
