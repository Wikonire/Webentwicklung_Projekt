const path = require('path');
const fs = require('fs');
const os = require('os');
const nock = require('nock');
const request = require('supertest');

const ORS_BASE = 'https://api.openrouteservice.org';

describe('ORS proxy routes', () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        nock.enableNetConnect('127.0.0.1')
    });
    afterEach(() => {
        console.error.mockRestore();
    });

    let app;
    let tmpDb;

    beforeAll(() => {
        // Eigene, frische DB pro Suite
        tmpDb = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wayfinder-')), 'test.db');
        process.env.DB_PATH = tmpDb;
        process.env.ORS_API_KEY = 'test-key';
        process.env.CORS_ORIGIN = 'http://localhost:4200';
    });

    beforeEach(() => {
        // Module neu laden, damit config/env frisch gezogen werden
        jest.resetModules();

        // nock aktivieren (keine echten Netzwerkanfragen)
        nock.disableNetConnect();
        // Erlaube localhost (Supertest)
        nock.enableNetConnect('127.0.0.1');

        app = require('../src/index');
    });

    afterEach(() => {
        nock.cleanAll();
        nock.enableNetConnect();
    });

    afterAll(() => {
        try { fs.unlinkSync(tmpDb); } catch {}
    });

    test('GET /ors/autocomplete proxied to ORS autocomplete', async () => {
        const scope = nock(ORS_BASE, {
            reqheaders: { authorization: 'test-key' } // Header exakt wie in deinem Service
        })
            .get('/geocode/autocomplete')
            .query({ text: 'Bas' })
            .reply(200, {
                features: [
                    { properties: { label: 'Basel, CH' }, geometry: { coordinates: [7.59, 47.56] } }
                ]
            });

        const res = await request(app).get('/ors/autocomplete').query({ query: 'Bas' });
        expect(res.status).toBe(200);
        expect(res.body.features?.[0]?.properties?.label).toBe('Basel, CH');
        expect(scope.isDone()).toBe(true);
    });

    test('GET /ors/geocode proxied to ORS search', async () => {
        const scope = nock(ORS_BASE, {
            reqheaders: { authorization: 'test-key' }
        })
            .get('/geocode/search')
            .query({ text: 'Basel' })
            .reply(200, {
                features: [
                    { properties: { name: 'Basel' }, geometry: { coordinates: [7.59, 47.56] } }
                ]
            });

        const res = await request(app).get('/ors/geocode').query({ query: 'Basel' });
        expect(res.status).toBe(200);
        expect(res.body.features?.[0]?.properties?.name).toBe('Basel');
        expect(scope.isDone()).toBe(true);
    });

    test('POST /ors/directions returns FeatureCollection with LineString', async () => {
        const bodyCheck = (body) => {
            return body?.geometry_format === 'geojson' &&
                Array.isArray(body.coordinates) &&
                body.coordinates.length === 2;
        };

        const scope = nock(ORS_BASE, {
            reqheaders: { authorization: 'test-key', 'content-type': 'application/json' }
        })
            .post('/v2/directions/driving-car', bodyCheck)
            .reply(200, {
                routes: [
                    {
                        geometry: { type: 'LineString', coordinates: [[7.59,47.56], [8.31,47.05]] },
                        summary: { distance: 100000, duration: 3600 }
                    }
                ]
            });

        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [7.59,47.56], end: [8.31,47.05], profile: 'driving-car' });

        expect(res.status).toBe(200);
        expect(res.body.type).toBe('FeatureCollection');
        expect(res.body.features?.[0]?.geometry?.type).toBe('LineString');
        expect(res.body.features?.[0]?.properties?.distance).toBe(100000);
        expect(scope.isDone()).toBe(true);
    });

    test('POST /ors/directions validates bad input', async () => {
        const res = await request(app)
            .post('/ors/directions')
            .send({ start: [7.59], end: [8.31,47.05] });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/start\/end/i);
    });

    test('GET /ors/autocomplete surfaces upstream error', async () => {
        const scope = nock(ORS_BASE).get('/geocode/autocomplete').query(true).reply(401, 'Unauthorized');

        const res = await request(app).get('/ors/autocomplete').query({ query: 'Bas' });
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
        expect(scope.isDone()).toBe(true);
    });
});
