const request = require('supertest');
const app = require('../index');

describe('Routes CRUD', () => {
    const userId = 'u1';
    let id;

    it('POST /routes erstellt', async () => {
        const res = await request(app).post('/routes').send({
            userId,
            name: 'Home -> Work',
            startLat: 52.52, startLng: 13.405,
            endLat: 53.55, endLng: 9.99,
            distance: 289000, duration: 12000,
            geometry: { type: 'LineString', coordinates: [[13.405,52.52],[9.99,53.55]] }
        });
        expect(res.status).toBe(201);
        id = res.body.id;
    });

    it('GET /routes listet', async () => {
        const res = await request(app).get('/routes').query({ userId });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /routes/:id holt', async () => {
        const res = await request(app).get(`/routes/${id}`).query({ userId });
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(id);
    });

    it('DELETE /routes/:id löscht', async () => {
        const res = await request(app).delete(`/routes/${id}`).query({ userId });
        expect(res.status).toBe(204);
    });
});
