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
    autocomplete,
    geocode,
    orsFetch,
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
            expect(String(url)).toEqual('https://mock.ors//test?q=x');
            expect(result.data).toEqual({ foo: 'bar' });
        });

        it('gibt 502 bei Fehler zurück', async () => {
            fetchMock.mockRejectedValueOnce(new Error('boom'));
            const result = await orsFetch('/fail');
            expect(result.ok).toBe(false);
            expect(result.status).toBe(502);
            expect(result.data).toMatch(/Network error: boom/);
        });

        it('gibt 500 zurück wenn ORS_API_KEY fehlt', async () => {
            jest.resetModules(); // Modulcache leeren

            // Config ohne Key mocken
            await jest.unstable_mockModule('../config.js', () => ({
                ORS_BASE: 'https://mock.ors/',
                ORS_API_KEY: undefined,   // kein API-Key
            }));

            // node-fetch muss auch gemockt sein, wird aber in diesem Fall gar nicht aufgerufen
            await jest.unstable_mockModule('node-fetch', () => ({
                default: jest.fn(),
            }));

            // Modul frisch importieren → zieht neue Config
            const { orsFetch: orsFetchNoKey } = await import('./ors.service.js');

            const result = await orsFetchNoKey('/any');

            expect(result.ok).toBe(false);
            expect(result.status).toBe(500);
            expect(result.data).toBe('Missing ORS_API_KEY');
        });


    });



    describe('Wrapper', () => {
        it('autocomplete ruft fetch mit Parametern auf', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"features": []}'),
            });

            const result = await autocomplete({ text: 'bern', size: 5 });

            const [url] = fetchMock.mock.calls[0];
            expect(String(url)).toContain('/geocode/autocomplete?text=bern&size=5');
            expect(result.ok).toBe(true);
        });

        it('geocode ruft fetch mit Parametern auf', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"features": []}'),
            });

            await geocode({ text: 'zurich' });

            const [url] = fetchMock.mock.calls[0];
            expect(String(url)).toContain('/geocode/search?text=zurich');
        });

        it('directions ruft fetch mit Profil und Koordinaten', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{}'),
            });

            await directions('driving-car', [8.5, 47.3], [8.6, 47.4]);

            const [url, options] = fetchMock.mock.calls[0];
            expect(String(url)).toContain('/v2/directions/driving-car');
            expect(options.method).toBe('POST');
            expect(options.body).toBe(JSON.stringify({
                coordinates: [[8.5, 47.3], [8.6, 47.4]],
                instructions: false,
            }));
        });
    });
});
