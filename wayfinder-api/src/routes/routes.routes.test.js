import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// 1. Mocks vorbereiten
await jest.unstable_mockModule('../../src/repos/routes.repo.js', () => ({
    default: {
        insert: jest.fn(),
        listByUser: jest.fn(),
        getOne: jest.fn(),
        remove: jest.fn(),
    }
}));

await jest.unstable_mockModule('../../src/validators/routes.validators.js', () => ({
    validateCreateRoute: jest.fn(),
}));

// 2. Module nach den Mocks importieren
const { default: repo } = await import('../../src/repos/routes.repo.js');
const { validateCreateRoute } = await import('../../src/validators/routes.validators.js');
const { default: routesRouter } = await import('../../src/routes/routes.routes.js');

const makeApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/routes', routesRouter);
    return app;
};

describe('routes/routes.routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        app = makeApp();
    });

    // ---------- POST /routes ----------
    test('POST /routes -> 400 wenn Validierung fehlschlägt', async () => {
        validateCreateRoute.mockReturnValue('userId fehlt');

        const res = await request(app).post('/routes').send({ name: 'x' });

        expect(validateCreateRoute).toHaveBeenCalled();
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/userId fehlt/i);
        expect(repo.insert).not.toHaveBeenCalled();
    });

    test('POST /routes -> 201 + gespeicherte Route', async () => {
        validateCreateRoute.mockReturnValue(null);
        const saved = {
            id: 'r1',
            userId: 'u1',
            name: 'Home → Work',
            geometry: { type: 'LineString', coordinates: [[7.59, 47.56], [8.31, 47.05]] },
            createdAt: '2025-08-25T12:00:00Z',
        };
        repo.insert.mockReturnValue(saved);

        const payload = {
            userId: 'u1',
            startLat: 47.56, startLng: 7.59,
            endLat: 47.05, endLng: 8.31,
            geometry: saved.geometry,
        };

        const res = await request(app).post('/routes').send(payload);

        expect(validateCreateRoute).toHaveBeenCalledWith(expect.objectContaining(payload));
        expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining(payload));
        expect(res.status).toBe(201);
        expect(res.body).toEqual(saved);
    });

    // ---------- GET /routes ----------
    test('GET /routes -> 400 wenn userId fehlt', async () => {
        const res = await request(app).get('/routes');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/userId erforderlich/i);
        expect(repo.listByUser).not.toHaveBeenCalled();
    });

    test('GET /routes -> 200 + Liste für userId', async () => {
        const rows = [{ id: 'a', userId: 'u1' }, { id: 'b', userId: 'u1' }];
        repo.listByUser.mockReturnValue(rows);

        const res = await request(app).get('/routes').query({ userId: 'u1' });

        expect(repo.listByUser).toHaveBeenCalledWith('u1');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(rows);
    });

    // ---------- GET /routes/:id ----------
    test('GET /routes/:id -> 400 wenn userId fehlt', async () => {
        const res = await request(app).get('/routes/r1');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/userId erforderlich/i);
        expect(repo.getOne).not.toHaveBeenCalled();
    });

    test('GET /routes/:id -> 404 wenn nicht gefunden/anderer Nutzer', async () => {
        repo.getOne.mockReturnValue(null);

        const res = await request(app).get('/routes/r1').query({ userId: 'u1' });

        expect(repo.getOne).toHaveBeenCalledWith('r1', 'u1');
        expect(res.status).toBe(404);
    });

    test('GET /routes/:id -> 200 + Route', async () => {
        const row = { id: 'r1', userId: 'u1' };
        repo.getOne.mockReturnValue(row);

        const res = await request(app).get('/routes/r1').query({ userId: 'u1' });

        expect(res.status).toBe(200);
        expect(res.body).toEqual(row);
    });

    // ---------- DELETE /routes/:id ----------
    test('DELETE /routes/:id -> 400 wenn userId fehlt', async () => {
        const res = await request(app).delete('/routes/r1');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/userId erforderlich/i);
        expect(repo.remove).not.toHaveBeenCalled();
    });

    test('DELETE /routes/:id -> 404 wenn remove=false', async () => {
        repo.remove.mockReturnValue(false);

        const res = await request(app).delete('/routes/r1').query({ userId: 'u1' });

        expect(repo.remove).toHaveBeenCalledWith('r1', 'u1');
        expect(res.status).toBe(404);
    });

    test('DELETE /routes/:id -> 204 wenn remove=true', async () => {
        repo.remove.mockReturnValue(true);

        const res = await request(app).delete('/routes/r1').query({ userId: 'u1' });

        expect(repo.remove).toHaveBeenCalledWith('r1', 'u1');
        expect(res.status).toBe(204);
        expect(res.text).toBe('');
    });
});
