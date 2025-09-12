import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const fetchMock = jest.fn();

// Mocks vor Import definieren
await jest.unstable_mockModule('node-fetch', () => ({ default: fetchMock }));

await jest.unstable_mockModule('../config.js', () => ({
    ORS_BASE: 'https://mock.ors/',
    ORS_API_KEY: 'mock-key',
}));

// Import der getesteten Module erst danach
const {
    toQueryString,
    readJsonSafe,
    orsFetch,
    autocomplete,
    geocode,
    directions,
} = await import('./ors.service.js');

describe('ors.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('toQueryString', () => {
        it('baut Querystring korrekt', () => {
            expect(toQueryString({ a: 1, b: 'x', c: null })).toBe('a=1&b=x');
        });
    });

    describe('readJsonSafe', () => {
        it('parst gültiges JSON', async () => {
            const res = { text: () => Promise.resolve('{"ok":true}') };
            expect(await readJsonSafe(res)).toEqual({ ok: true });
        });

        it('fällt auf Text zurück', async () => {
            const res = { text: () => Promise.resolve('nope') };
            expect(await readJsonSafe(res)).toBe('nope');
        });
    });

    describe('orsFetch', () => {
        it('macht GET mit Querystring', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"foo":"bar"}'),
            });

            const result = await orsFetch('/test', { query: { q: 'x' } });

            const [url, options] = fetchMock.mock.calls[0];
            expect(options.method).toBe('GET');
            expect(options.headers.Authorization).toBe('mock-key');
            expect(options.headers.Accept).toBe('application/json');
        });

        it('gibt 502 bei Fehler zurück', async () => {
            fetchMock.mockRejectedValueOnce(new Error('boom'));
            const result = await orsFetch('/fail');
            expect(result.ok).toBe(false);
            expect(result.status).toBe(502);
            expect(result.data).toMatch(/Network error: boom/);
        });
    });

    describe('Wrapper', () => {


        it('directions ruft orsFetch mit Profil und Koordinaten', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{}'),
            });
            await directions('driving-car', [8.5, 47.3], [8.6, 47.4]);
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining( "https://mock.ors//v2/directions/driving-car"),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        coordinates: [[8.5, 47.3], [8.6, 47.4]],
                        instructions: false,
                    }),
                })
            );
        });
    });
});
