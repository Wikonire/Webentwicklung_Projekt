// src/routes/routes.routes.test.js
import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';
import polyline from '@mapbox/polyline';

// --- Mocks ---
await jest.unstable_mockModule('../repos/routes.repo.js', () => ({
    default: {
        insert: jest.fn(),
        listByUser: jest.fn(),
        getOne: jest.fn(),
        remove: jest.fn(),
    },
}));

await jest.unstable_mockModule('../validators/routes.validators.js', () => ({
    validateCreateRoute: jest.fn(),
}));

await jest.unstable_mockModule('../services/ors.service.js', () => ({
    directions: jest.fn(),
}));

// Imports nach Mocks
const repo = (await import('../repos/routes.repo.js')).default;
const { validateCreateRoute } = await import('../validators/routes.validators.js');
const { directions } = await import('../services/ors.service.js');
const router = (await import('./routes.routes.js')).default;

// Hilfs-App
const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/routes', router);
    return app;
};

describe('routes.routes', () => {
    let app;
    beforeAll(() => {
        app = makeApp();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /routes', () => {
        const baseBody = {
            startCoord: [7.1, 47.2],
            destinationCoord: [8.3, 47.4],
            startLabel: 'Start',
            destinationLabel: 'Ziel',
            profile: 'driving-car',
        };

        test('liefert 400 wenn Validator Fehler zurückgibt', async () => {
            validateCreateRoute.mockReturnValue('startCoord fehlt');
            const res = await request(app).post('/routes').send(baseBody);
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('startCoord fehlt');
        });

        test('liefert Fehler wenn ORS Directions fehlschlägt', async () => {
            validateCreateRoute.mockReturnValue(null);
            directions.mockResolvedValueOnce({
                ok: false,
                status: 502,
                data: { error: { message: 'ORS kaputt', code: 999 } },
            });
            const res = await request(app).post('/routes').send(baseBody);
            expect(res.status).toBe(502);
            expect(res.body.error).toBe('ORS kaputt');
            expect(res.body.code).toBe(999);
        });

        test('speichert Route wenn ORS FeatureCollection liefert', async () => {
            validateCreateRoute.mockReturnValue(null);
            directions.mockResolvedValueOnce({
                ok: true,
                data: {
                    type: 'FeatureCollection',
                    features: [{ properties: { summary: { distance: 12, duration: 34 } } }],
                },
            });
            repo.insert.mockReturnValue({ id: '1', startLabel: 'Start' });

            const res = await request(app).post('/routes').send(baseBody);
            expect(res.status).toBe(201);
            expect(repo.insert).toHaveBeenCalled();
            expect(res.body.id).toBe('1');
        });

        test('speichert Route wenn ORS routes[] liefert', async () => {
            validateCreateRoute.mockReturnValue(null);
            const encoded = polyline.encode([[47.0, 8.0], [47.1, 8.1]]);
            directions.mockResolvedValueOnce({
                ok: true,
                data: {
                    routes: [{ geometry: encoded, summary: { distance: 55, duration: 66 } }],
                },
            });
            repo.insert.mockReturnValue({ id: '2', startLabel: 'Start' });

            const res = await request(app).post('/routes').send(baseBody);
            expect(res.status).toBe(201);
            expect(repo.insert).toHaveBeenCalled();
            expect(res.body.id).toBe('2');
        });

        test('liefert 500 wenn unbekanntes ORS-Format', async () => {
            validateCreateRoute.mockReturnValue(null);
            directions.mockResolvedValueOnce({ ok: true, data: { foo: 'bar' } });
            const res = await request(app).post('/routes').send(baseBody);
            expect(res.status).toBe(500);
            expect(res.body.error).toMatch(/Interner Fehler/);
        });
    });

    describe('GET /routes', () => {
        test('liefert Liste aus repo.listByUser', async () => {
            repo.listByUser.mockReturnValue([{ id: 'a' }]);
            const res = await request(app).get('/routes');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: 'a' }]);
        });
    });

    describe('GET /routes/:id', () => {
        test('liefert 404 wenn Route nicht existiert', async () => {
            repo.getOne.mockReturnValue(undefined);
            const res = await request(app).get('/routes/doesnotexist');
            expect(res.status).toBe(404);
        });

        test('liefert Route wenn vorhanden', async () => {
            repo.getOne.mockReturnValue({ id: '1', startLabel: 'Start' });
            const res = await request(app).get('/routes/1');
            expect(res.status).toBe(200);
            expect(res.body.id).toBe('1');
        });
    });

    describe('DELETE /routes/:id', () => {
        test('liefert 404 wenn nicht gefunden', async () => {
            repo.remove.mockReturnValue(false);
            const res = await request(app).delete('/routes/doesnotexist');
            expect(res.status).toBe(404);
        });

        test('liefert 204 wenn erfolgreich gelöscht', async () => {
            repo.remove.mockReturnValue(true);
            const res = await request(app).delete('/routes/1');
            expect(res.status).toBe(204);
        });
    });
});
