const express = require('express');
const request = require('supertest');

jest.mock('../../src/services/ors.service', () => ({
    autocomplete: jest.fn(),
    geocode: jest.fn(),
    directions: jest.fn(),
}));
const { autocomplete, geocode, directions } = require('../../src/services/ors.service');

const orsRouter = require('../../src/routes/ors.routes');

//   App-Bauen-Helper
const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/ors', orsRouter);
    return app;
};

describe('routes/ors.routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        app = makeApp();
    });

    // ---------- /ors/autocomplete ----------
    test('GET /ors/autocomplete -> 200 + Body (Success)', async () => {
        autocomplete.mockResolvedValue({
            ok: true,
            status: 200,
            data: { features: [{ properties: { label: 'Basel, CH' } }] },
        });

        const res = await request(app).get('/ors/autocomplete').query({ query: 'Bas' });

        expect(autocomplete).toHaveBeenCalledWith('Bas');
        expect(res.status).toBe(200);
        expect(res.body.features?.[0]?.properties?.label).toBe('Basel, CH');
    });

    test('GET /ors/autocomplete -> 400 wenn query fehlt', async () => {
        const res = await request(app).get('/ors/autocomplete'); // kein query
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/query.*erforderlich/i);
        expect(autocomplete).not.toHaveBeenCalled();
    });

    test('GET /ors/autocomplete -> Upstream-Fehler wird durchgereicht (z.B. 401)', async () => {
        autocomplete.mockResolvedValue({
            ok: false,
            status: 401,
            data: { error: 'Unauthorized' },
        });

        const res = await request(app).get('/ors/autocomplete').query({ query: 'Bas' });

        expect(res.status).toBe(401);
        expect(res.body.error || res.text).toBeTruthy();
    });

    // ---------- /ors/geocode ----------
    test('GET /ors/geocode -> 200 + Body (Success)', async () => {
        geocode.mockResolvedValue({
            ok: true,
            status: 200,
            data: { features: [{ properties: { name: 'Basel' } }] },
        });

        const res = await request(app).get('/ors/geocode').query({ query: 'Basel' });

        expect(geocode).toHaveBeenCalledWith('Basel');
        expect(res.status).toBe(200);
        expect(res.body.features?.[0]?.properties?.name).toBe('Basel');
    });

    test('GET /ors/geocode -> Upstream-Fehler (403) wird durchgereicht', async () => {
        geocode.mockResolvedValue({
            ok: false,
            status: 403,
            data: { error: 'Forbidden' },
        });

        const res = await request(app).get('/ors/geocode').query({ query: 'Basel' });

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Forbidden');
    });

    // ---------- /ors/directions ----------
    test('POST /ors/directions -> 400 bei invalidem Input', async () => {
        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [7.59], end: [8.31, 47.05] });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/start\/end/i);
        expect(directions).not.toHaveBeenCalled();
    });

    test('POST /ors/directions -> 200 + FeatureCollection bei LineString-Route', async () => {
        directions.mockResolvedValue({
            ok: true,
            status: 200,
            data: {
                routes: [{
                    geometry: { type: 'LineString', coordinates: [[7.59, 47.56], [8.31, 47.05]] },
                    summary: { distance: 100000, duration: 3600 },
                }],
            },
        });

        const start = [7.59, 47.56];
        const end = [8.31, 47.05];
        const res = await request(app).post('/ors/directions').send({ start, end, profile: 'driving-car' });

        expect(directions).toHaveBeenCalledWith('driving-car', start, end);
        expect(res.status).toBe(200);
        expect(res.body.type).toBe('FeatureCollection');
        expect(res.body.features?.[0]?.geometry?.type).toBe('LineString');
        expect(res.body.features?.[0]?.properties?.distance).toBe(100000);
        expect(res.body.features?.[0]?.properties?.duration).toBe(3600);
    });

    test('POST /ors/directions -> Upstream-Fehler (429) wird durchgereicht', async () => {
        directions.mockResolvedValue({
            ok: false,
            status: 429,
            data: { error: 'Too Many Requests' },
        });

        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [7.59, 47.56], end: [8.31, 47.05] });

        expect(res.status).toBe(429);
        expect(res.body.error).toBe('Too Many Requests');
    });

    test('POST /ors/directions -> passt Response durch, wenn kein LineString', async () => {
        const passthrough = { routes: [{ geometry: null }] };
        directions.mockResolvedValue({ ok: true, status: 200, data: passthrough });

        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [7.59, 47.56], end: [8.31, 47.05] });

        expect(res.status).toBe(200);
        expect(res.body).toEqual(passthrough);
    });

    test('POST /ors/directions -> nutzt default profile "driving-car" wenn keins gesetzt', async () => {
        directions.mockResolvedValue({
            ok: true,
            status: 200,
            data: { routes: [{ geometry: { type: 'LineString', coordinates: [[0,0],[1,1]] }, summary: {} }] },
        });

        const start = [7.59, 47.56];
        const end = [8.31, 47.05];
        const res = await request(app).post('/ors/directions').send({ start, end });

        expect(directions).toHaveBeenCalledWith('driving-car', start, end); // default
        expect(res.status).toBe(200);
    });
});
