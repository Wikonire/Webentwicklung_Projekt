import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import polyline from '@mapbox/polyline';

await jest.unstable_mockModule('../services/ors.service.js', () => ({
    autocomplete: jest.fn(),
    geocode: jest.fn(),
    directions: jest.fn(),
}));

const { autocomplete, geocode, directions} = await import('../services/ors.service.js');
const { default: orsRouter, prepareQueryToOrs, mapFeatureToSuggestion, isLngLat, normalizeLngLat, sendSuggestionResponse, validateDirectionsDto, isValidCoord, validateLayers} = await import('./ors.routes.js');

const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/ors', orsRouter);
    return app;
};

describe('ors.routes', () => {
    let app;
    beforeAll(() => {
        app = makeApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /ors/autocomplete liefert Suggestions bei ok Antwort', async () => {
        autocomplete.mockResolvedValueOnce({
            ok: true,
            status: 200,
            data: {
                features: [
                    {
                        properties: { id: '85682309', label: 'Zurich, Switzerland' },
                        geometry: { coordinates: [ 8.660983, 47.390036] },
                    },
                ],
            },
        });

        const res = await request(app).get('/ors/autocomplete?query=zurich');

        expect(res.status).toBe(200);
        expect(res.body.suggestions[0]).toEqual({
            id: '85682309',
            label: 'Zurich, Switzerland',
            coord: [8.660983, 47.390036],
        });
    });

    it('GET /ors/autocomplete liefert Fehler bei Upstream-Error', async () => {
        autocomplete.mockResolvedValueOnce({
            ok: false,
            status: 500,
            data: 'ORS kaputt',
        });

        const res = await request(app).get('/ors/autocomplete?query=foo');

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('ORS kaputt');
    });

    it('GET /ors/geocode ruft geocode Service auf', async () => {
        geocode.mockResolvedValueOnce({ ok: true, status: 200, data: { features: [] } });

        const res = await request(app).get('/ors/geocode?query=bern');

        expect(res.status).toBe(200);
        expect(geocode).toHaveBeenCalled();
    });

    it('POST /ors/directions liefert FeatureCollection bei Polyline', async () => {
        directions.mockResolvedValueOnce({
            ok: true,
            status: 200,
            data: {
                routes: [
                    {
                        geometry: '_p~iF~ps|U_ulLnnqC', // gültiges Polyline
                        summary: { distance: 1 },
                    },
                ],
            },
        });

        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [8.55, 47.37], end: [8.56, 47.38], profile: 'driving-car' });

        expect(res.status).toBe(200);
        expect(res.body.type).toBe('FeatureCollection');
        expect(res.body.features[0].geometry.type).toBe('LineString');
    });


    it('POST /ors/directions reicht GeoJSON durch', async () => {
        const fc = { type: 'FeatureCollection', features: [] };
        directions.mockResolvedValueOnce({ ok: true, status: 200, data: fc });

        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [8.55, 47.37], end: [8.56, 47.38], profile: 'driving-car' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual(fc);
    });

    describe('prepareQueryToOrs', () => {
        let baseQuery;
        let req;

        beforeEach(() => {
            baseQuery = {};
            req = { query: {} };
        });

        describe('layers handling', () => {
            it('setzt defaultLayers wenn keine layers übergeben', () => {
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result.layers).toBe('address,street,locality,venue');
            });

            it('setzt layers aus req.query wenn gültig', () => {
                req.query.layers = 'locality';
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result.layers).toBe('locality');
            });

            it('wirft Fehler bei ungültigen layers', () => {
                req.query.layers = 'invalidlayer';
                expect(() => prepareQueryToOrs(baseQuery, req)).toThrow(
                    "Ungültiger Layer: 'invalidlayer'. Erlaubt:"
                );
            });
        });

        describe('size handling', () => {
            it('setzt defaultSize wenn size fehlt', () => {
                const result = prepareQueryToOrs(baseQuery, req, 10);
                expect(result.size).toBe(10);
            });

            it('setzt size wenn gültig', () => {
                req.query.size = '5';
                const result = prepareQueryToOrs(baseQuery, req, 10);
                expect(result.size).toBe(5);
            });

            it('klammert size wenn zu groß', () => {
                req.query.size = '50';
                const result = prepareQueryToOrs(baseQuery, req, 10);
                expect(result.size).toBe(30);
            });

            it('klammert size wenn zu klein', () => {
                req.query.size = '-1';
                const result = prepareQueryToOrs(baseQuery, req, 10);
                expect(result.size).toBe(1);
            });
        });

        describe('language and country handling', () => {
            it('fügt lang hinzu wenn übergeben', () => {
                req.query.lang = 'de';
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result.lang).toBe('de');
            });

            it('fügt boundary.country hinzu wenn übergeben', () => {
                req.query.country = 'CH';
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result['boundary.country']).toBe('CH');
            });
        });

        describe('focus point handling', () => {
            it('setzt focus.point wenn lat/lon gültig', () => {
                req.query.lat = '47.3';
                req.query.lon = '8.5';
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result['focus.point.lat']).toBe(47.3);
                expect(result['focus.point.lon']).toBe(8.5);
            });

            it('ignoriert focus.point wenn lat ungültig', () => {
                req.query.lat = 'foo';
                req.query.lon = '8.5';
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result['focus.point.lat']).toBeUndefined();
                expect(result['focus.point.lon']).toBeUndefined();
            });

            it('ignoriert focus.point wenn lon ungültig', () => {
                req.query.lat = '47.3';
                req.query.lon = 'bar';
                const result = prepareQueryToOrs(baseQuery, req);
                expect(result['focus.point.lat']).toBeUndefined();
                expect(result['focus.point.lon']).toBeUndefined();
            });
        });
    });

    describe('mapFeatureToSuggestion', () => {
        it('wandelt ein vollständiges Feature korrekt um', () => {
            const feature = {
                properties: { id: '123', label: 'Zürich' },
                geometry: { coordinates: [8.55, 47.37] },
            };

            const result = mapFeatureToSuggestion(feature);

            expect(result).toEqual({
                id: '123',
                label: 'Zürich',
                coord: [8.55, 47.37],
            });
        });

        it('setzt id auf null wenn keine properties.id vorhanden ist', () => {
            const feature = {
                properties: { label: 'Bern' },
                geometry: { coordinates: [7.44, 46.95] },
            };

            const result = mapFeatureToSuggestion(feature);

            expect(result.id).toBeNull();
            expect(result.label).toBe('Bern');
        });

        it('setzt label auf "Unbekannt" wenn kein Label vorhanden ist', () => {
            const feature = {
                properties: { id: '99' },
                geometry: { coordinates: [9.0, 45.0] },
            };

            const result = mapFeatureToSuggestion(feature);

            expect(result.label).toBe('Unbekannt');
            expect(result.id).toBe('99');
        });

        it('liefert NaN-Koordinaten wenn geometry fehlt', () => {
            const feature = {
                properties: { id: '42', label: 'Ohne Geometrie' },
                geometry: {},
            };

            const result = mapFeatureToSuggestion(feature);

            expect(result.coord[0]).toBeNaN();
            expect(result.coord[1]).toBeNaN();
        });
    });

    describe('isLngLat', () => {
        it('gibt true zurück für ein korrektes Lon/Lat Array', () => {
            const candidate = [8.55, 47.37];
            expect(isLngLat(candidate)).toBe(true);
        });

        it('gibt false zurück wenn candidate kein Array ist', () => {
            expect(isLngLat('not-an-array')).toBe(false);
            expect(isLngLat(null)).toBe(false);
            expect(isLngLat(undefined)).toBe(false);
        });

        it('gibt false zurück wenn Array nicht genau zwei Elemente hat', () => {
            expect(isLngLat([8.55])).toBe(false);
            expect(isLngLat([8.55, 47.37, 123])).toBe(false);
        });

        it('gibt false zurück wenn Werte nicht in Zahlen umwandelbar sind', () => {
            expect(isLngLat(['foo', 47.37])).toBe(false);
            expect(isLngLat([8.55, 'bar'])).toBe(false);
            expect(isLngLat([NaN, 47.37])).toBe(false);
        });
    });

    describe('normalizeLngLat', () => {
        it('wandelt numerische Werte unverändert zurück', () => {
            const input = [8.55, 47.37];
            const result = normalizeLngLat(input);
            expect(result).toEqual([8.55, 47.37]);
        });

        it('wandelt Strings in Zahlen um', () => {
            const input = ['8.55', '47.37'];
            const result = normalizeLngLat(input);
            expect(result).toEqual([8.55, 47.37]);
        });

        it('liefert NaN wenn Werte nicht in Zahl konvertierbar sind', () => {
            const input = ['foo', 'bar'];
            const result = normalizeLngLat(input);
            expect(Number.isNaN(result[0])).toBe(true);
            expect(Number.isNaN(result[1])).toBe(true);
        });
    });

    describe('sendSuggestionResponse', () => {
        let mockRes;

        beforeEach(() => {
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn().mockReturnThis(),
            };
            jest.spyOn(console, 'error').mockImplementation(() => {}); // console.error unterdrücken
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('liefert Fehler wenn ok=false und data ein String ist', () => {
            const upstreamResponse = { ok: false, status: 500, data: 'Kaputt' };

            sendSuggestionResponse(upstreamResponse, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Kaputt' });
        });

        it('liefert Fehler wenn ok=false und data ein Objekt ist', () => {
            const upstreamResponse = { ok: false, status: 502, data: { error: 'Bad Gateway' } };

            sendSuggestionResponse(upstreamResponse, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(502);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Bad Gateway' });
        });

        it('liefert Default Fehler wenn ok=false und data fehlt', () => {
            const upstreamResponse = { ok: false, status: 503, data: null };

            sendSuggestionResponse(upstreamResponse, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(503);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Upstream error' });
        });

        it('liefert Suggestions wenn ok=true und features existieren', () => {
            const upstreamResponse = {
                ok: true,
                status: 200,
                data: {
                    features: [
                        { properties: { id: '1', label: 'Zürich' }, geometry: { coordinates: [8.55, 47.37] } },
                    ],
                },
            };

            sendSuggestionResponse(upstreamResponse, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                suggestions: [
                    { id: '1', label: 'Zürich', coord: [8.55, 47.37] },
                ],
            });
        });

        it('liefert leeres Suggestions Array wenn keine features vorhanden', () => {
            const upstreamResponse = { ok: true, status: 200, data: {} };

            sendSuggestionResponse(upstreamResponse, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ suggestions: [] });
        });
    });

    describe('validateDirectionsDto', () => {
        it('gibt Fehler zurück wenn start kein gültiges LngLat ist', () => {
            const dto = { start: 'foo', end: [8.5, 47.3], profile: 'driving-car' };
            expect(validateDirectionsDto(dto)).toBe('start muss [lon,lat] (Zahlen) sein');
        });

        it('gibt Fehler zurück wenn end kein gültiges LngLat ist', () => {
            const dto = { start: [8.5, 47.3], end: 'bar', profile: 'driving-car' };
            expect(validateDirectionsDto(dto)).toBe('end muss [lon,lat] (Zahlen) sein');
        });

        it('gibt Fehler zurück wenn start außerhalb Koordinatenbereich ist', () => {
            const dto = { start: [200, 47.3], end: [8.5, 47.3], profile: 'driving-car' };
            expect(validateDirectionsDto(dto)).toBe('start muss <= -180 und <=180 sein');
        });

        it('gibt Fehler zurück wenn end außerhalb Koordinatenbereich ist', () => {
            const dto = { start: [8.5, 47.3], end: [181, 47.3], profile: 'driving-car' };
            expect(validateDirectionsDto(dto)).toBe('end muss <= -180 und <=180 sein');
        });

        it('gibt Fehler zurück wenn Profil ungültig ist', () => {
            const dto = { start: [8.5, 47.3], end: [8.6, 47.4], profile: 'spaceship' };
            const result = validateDirectionsDto(dto);
            expect(result).toMatch(/spaceship ist kein gültiges Profil/);
        });

        it('gibt null zurück wenn alles gültig ist', () => {
            const dto = { start: [8.5, 47.3], end: [8.6, 47.4], profile: 'driving-car' };
            expect(validateDirectionsDto(dto)).toBeNull();
        });
    });

    describe('isValidCoord', () => {
        it('gibt true für gültige Koordinaten zurück', () => {
            expect(isValidCoord([8.55, 47.37])).toBe(true);
        });

        it('gibt false zurück wenn kein Array übergeben wird', () => {
            expect(isValidCoord(null)).toBe(false);
            expect(isValidCoord('8.55,47.37')).toBe(false);
        });

        it('gibt false zurück wenn Array nicht Länge 2 hat', () => {
            expect(isValidCoord([8.55])).toBe(false);
            expect(isValidCoord([8.55, 47.37, 100])).toBe(false);
        });

        it('gibt false zurück wenn Längengrad außerhalb von -180..180 liegt', () => {
            expect(isValidCoord([200, 47.37])).toBe(false);
            expect(isValidCoord([-200, 47.37])).toBe(false);
        });

        it('gibt false zurück wenn Breitengrad außerhalb von -90..90 liegt', () => {
            expect(isValidCoord([8.55, 100])).toBe(false);
            expect(isValidCoord([8.55, -100])).toBe(false);
        });
    });

    describe('validateLayers', () => {
        it('gibt Fehler zurück wenn kein String übergeben wird', () => {
            expect(validateLayers(null)).toBe('layers muss ein nicht-leerer String sein');
            expect(validateLayers(123)).toBe('layers muss ein nicht-leerer String sein');
        });

        it('gibt Fehler zurück wenn String leer ist', () => {
            expect(validateLayers('')).toBe('layers muss ein nicht-leerer String sein');
            expect(validateLayers('   ')).toBe('layers muss ein nicht-leerer String sein');
        });

        it('gibt null zurück wenn alle Layers gültig sind', () => {
            expect(validateLayers('address')).toBeNull();
            expect(validateLayers('address,street,locality')).toBeNull();
        });

        it('gibt Fehler zurück wenn ein Layer ungültig ist', () => {
            const result = validateLayers('address,invalidLayer');
            expect(result).toMatch(/^Ungültiger Layer: 'invalidLayer'/);
        });

        it('trimmt Leerzeichen um Layer-Namen', () => {
            expect(validateLayers(' address , street ')).toBeNull();
        });
    });

    describe('POST /ors/directions', () => {
        let app;
        beforeAll(() => {
            app = makeApp();
        });
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('liefert 400 wenn DTO ungültig', async () => {
            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [999, 999], end: [8.5, 47.3], profile: 'driving-car' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/start muss/);
        });

        it('liefert Upstream-Error durch', async () => {
            directions.mockResolvedValueOnce({
                ok: false,
                status: 504,
                data: 'Timeout',
            });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.55, 47.37], end: [8.56, 47.38], profile: 'driving-car' });

            expect(res.status).toBe(504);
            expect(res.body.error).toBe('Timeout');
        });

        it('decodiert Polyline zu GeoJSON', async () => {
            const poly = polyline.encode([[47.37, 8.55], [47.38, 8.56]]);
            directions.mockResolvedValueOnce({
                ok: true,
                status: 200,
                data: { routes: [{ geometry: poly, summary: { distance: 1 } }] },
            });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.55, 47.37], end: [8.56, 47.38], profile: 'driving-car' });

            expect(res.status).toBe(200);
            expect(res.body.type).toBe('FeatureCollection');
            expect(res.body.features[0].geometry.type).toBe('LineString');
        });

        it('reicht GeoJSON FeatureCollection durch', async () => {
            const fc = { type: 'FeatureCollection', features: [] };
            directions.mockResolvedValueOnce({ ok: true, status: 200, data: fc });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.55, 47.37], end: [8.56, 47.38], profile: 'driving-car' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(fc);
        });

        it('liefert leere FeatureCollection wenn keine Route-Daten vorhanden sind', async () => {
            directions.mockResolvedValueOnce({ ok: true, status: 200, data: {} });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.55, 47.37], end: [8.56, 47.38], profile: 'driving-car' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ type: 'FeatureCollection', features: [] });
        });
    });

    describe('POST /ors/directions – Upstream-Error Branches', () => {
        let app;
        beforeAll(() => {
            app = makeApp();
        });
        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('liefert Fehler-String als { error }', async () => {
            directions.mockResolvedValueOnce({
                ok: false,
                status: 500,
                data: 'Kaputt',
            });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.5, 47.3], end: [8.6, 47.4], profile: 'driving-car' });

            expect(res.status).toBe(500);
            expect(res.body).toEqual({ error: 'Kaputt' });
        });

        it('liefert Objekt-Fehler direkt durch', async () => {
            directions.mockResolvedValueOnce({
                ok: false,
                status: 502,
                data: { error: 'Bad Gateway' },
            });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.5, 47.3], end: [8.6, 47.4], profile: 'driving-car' });

            expect(res.status).toBe(502);
            expect(res.body).toEqual({ error: 'Bad Gateway' });
        });

        it('liefert Fallback { error: "Upstream error" } wenn data fehlt', async () => {
            directions.mockResolvedValueOnce({
                ok: false,
                status: 503,
                data: null,
            });

            const res = await request(app)
                .post('/ors/directions')
                .send({ start: [8.5, 47.3], end: [8.6, 47.4], profile: 'driving-car' });

            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'Upstream error' });
        });
    });

    describe('GET /ors/autocomplete', () => {
        let app;

        beforeAll(() => {
            app = makeApp();
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('liefert 400 wenn query fehlt', async () => {
            const res = await request(app).get('/ors/autocomplete'); // kein query param
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'query erforderlich' });
            expect(autocomplete).not.toHaveBeenCalled();
        });

        it('liefert Suggestions bei ok Antwort', async () => {
            autocomplete.mockResolvedValueOnce({
                ok: true,
                status: 200,
                data: {
                    features: [
                        {
                            properties: { id: '1', label: 'Zürich' },
                            geometry: { coordinates: [8.55, 47.37] },
                        },
                    ],
                },
            });

            const res = await request(app).get('/ors/autocomplete?query=zurich');

            expect(res.status).toBe(200);
            expect(res.body.suggestions[0]).toEqual({
                id: '1',
                label: 'Zürich',
                coord: [8.55, 47.37],
            });
        });

        it('liefert Fehler weiter wenn Upstream nicht ok', async () => {
            autocomplete.mockResolvedValueOnce({
                ok: false,
                status: 502,
                data: 'ORS kaputt',
            });

            const res = await request(app).get('/ors/autocomplete?query=fail');

            expect(res.status).toBe(502);
            expect(res.body).toEqual({ error: 'ORS kaputt' });
        });
    });
    describe('GET /ors/geocode', () => {
        let app;

        beforeAll(() => {
            app = makeApp();
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('liefert 400 wenn query fehlt', async () => {
            const res = await request(app).get('/ors/geocode'); // kein query param
            expect(res.status).toBe(400);
            expect(res.body).toEqual({ error: 'query erforderlich' });
            expect(geocode).not.toHaveBeenCalled();
        });

        it('liefert Suggestions bei ok Antwort', async () => {
            geocode.mockResolvedValueOnce({
                ok: true,
                status: 200,
                data: {
                    features: [
                        {
                            properties: { id: '1', label: 'Bern' },
                            geometry: { coordinates: [7.44, 46.95] },
                        },
                    ],
                },
            });

            const res = await request(app).get('/ors/geocode?query=bern');

            expect(res.status).toBe(200);
            expect(res.body.suggestions[0]).toEqual({
                id: '1',
                label: 'Bern',
                coord: [7.44, 46.95],
            });
        });

        it('liefert Fehler weiter wenn Upstream nicht ok', async () => {
            geocode.mockResolvedValueOnce({
                ok: false,
                status: 503,
                data: 'ORS down',
            });

            const res = await request(app).get('/ors/geocode?query=fail');

            expect(res.status).toBe(503);
            expect(res.body).toEqual({ error: 'ORS down' });
        });
    });

});
