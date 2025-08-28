const express = require('express');
const request = require('supertest');

const HANDLER_PATH = './error-handler';

// Hilfs-Builder 1: Standardrouten + Fehler-Handler
function makeDefaultApp(eh) {
    const a = express();
    a.use(express.json({ limit: '1mb' }));

    a.get('/throw-403', (_req, _res, next) => {
        const err = new Error('Forbidden');
        err.status = 403;
        next(err);
    });

    a.get('/throw-500', (_req, _res, next) => next(new Error('Boom')));

    a.get('/timeout', (_req, _res, next) => {
        const err = new Error('Timed out');
        err.name = 'AbortError'; // -> 504
        next(err);
    });

    a.post('/echo', (req, res) => res.json({ ok: true, body: req.body }));
    a.use(eh);
    return a;
}

// Hilfs-Builder 2: Custom-Route /t, die next(errFactory()) aufruft
function makeAppWithErrFactory(eh, errFactory) {
    const a = express();
    a.use(express.json({ limit: '1mb' }));
    a.get('/t', (_req, _res, next) => next(errFactory()));
    a.use(eh);
    return a;
}

describe('error-handler middleware', () => {
    let app;
    let errorHandler;
    let consoleErrSpy;

    beforeEach(() => {
        jest.resetModules();
        process.env.NODE_ENV = 'test';
        errorHandler = require(HANDLER_PATH);
        app = makeDefaultApp(errorHandler);
        consoleErrSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrSpy.mockRestore();
    });

    test('invalid JSON -> 400 with message', async () => {
        const res = await request(app)
            .post('/echo')
            .set('Content-Type', 'application/json')
            .send('{"broken": }');

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid json body/i);
        expect(consoleErrSpy).not.toHaveBeenCalled();
    });

    test('propagates explicit status (403)', async () => {
        const res = await request(app).get('/throw-403');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Request error');
        expect(res.body.detail).toMatch(/forbidden/i);
    });

    test('uncaught error -> 500', async () => {
        const res = await request(app).get('/throw-500');
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Server error');
        expect(res.body.detail).toMatch(/boom/i);
    });

    test('Abort/Timeout -> 504', async () => {
        const res = await request(app).get('/timeout');
        expect(res.status).toBe(504);
        expect(res.body.error).toBe('Server error');
        expect(res.body.detail).toMatch(/timed out/i);
    });

    test('production hides detail', async () => {
        jest.resetModules();
        process.env.NODE_ENV = 'production';
        const prodHandler = require(HANDLER_PATH);
        const prodApp = makeDefaultApp(prodHandler);

        const res = await request(prodApp).get('/throw-500');
        expect(res.status).toBe(500);
        expect(res.body.error).toBe('Server error');
        expect(res.body.detail).toBeUndefined();
    });

    describe('headers already sent', () => {
        test('behält 200-Response und reicht Fehler an nächsten Handler weiter', async () => {
            process.env.NODE_ENV = 'test';
            const handler = require(HANDLER_PATH);

            let capturedErr = null;
            const a = express();

            a.get('/ok-then-error', (req, res, next) => {
                res.status(200).send('ok');
                setImmediate(() => next(new Error('after send')));
            });

            a.use(handler);
            a.use((err, _req, _res, _next) => { capturedErr = err; });

            const res = await request(a).get('/ok-then-error');
            expect(res.status).toBe(200);
            expect(res.text).toBe('ok');

            await new Promise(r => setTimeout(r, 5));
            expect(capturedErr).toBeInstanceOf(Error);
            expect(capturedErr.message).toMatch(/after send/i);
        });

        test('loggt in NODE_ENV=test nicht', async () => {
            process.env.NODE_ENV = 'test';
            const handler = require(HANDLER_PATH);
            const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const a = express();

            a.get('/ok-then-error', (req, res, next) => {
                res.status(200).send('ok');
                setImmediate(() => next(new Error('after send')));
            });
            a.use(handler);
            a.use((_err, _req, _res, _next) => {});

            await request(a).get('/ok-then-error');
            await new Promise(r => setTimeout(r, 5));

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('status normalization + name handling', () => {
        let appWith;
        beforeEach(() => {
            process.env.NODE_ENV = 'test';
            jest.resetModules();
            errorHandler = require(HANDLER_PATH);
            appWith = (err) => makeAppWithErrFactory(errorHandler, () => err);
        });

        test('name = undefined → String(err.name ?? "") greift, kein 504', async () => {
            const err = new Error('undefined name');
            // sicherstellen, dass wirklich undefined ankommt
            try {
                err.name = undefined;
            } catch {
                Object.defineProperty(err, 'name', { value: undefined, configurable: true, writable: true });
            }

            const res = await request(appWith(err)).get('/t');
            expect(res.status).toBe(500);                 // kein "abort"/"timeout"-Match
            expect(res.body.error).toBe('Server error');
            expect(res.body.detail).toMatch(/undefined name/i);
        });

        test('name = null → String(err.name ?? "") greift, kein 504', async () => {
            const err = new Error('null name');
            try {
                err.name = null;
            } catch {
                Object.defineProperty(err, 'name', { value: null, configurable: true, writable: true });
            }

            const res = await request(appWith(err)).get('/t');
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Server error');
            expect(res.body.detail).toMatch(/null name/i);
        });


        test('robust gegen truthy Nicht-String-Namen (String(...).toLowerCase())', async () => {
            const err = new Error('weird');
            err.name = 12345;
            const res = await request(appWith(err)).get('/t');
            expect(res.status).toBe(500);
            expect(res.body.detail).toMatch(/weird/);
        });

        test('Objekt mit toString()="AbortError" -> 504', async () => {
            const err = new Error('boom');
            err.name = { toString: () => 'AbortError' };
            const res = await request(appWith(err)).get('/t');
            expect(res.status).toBe(504);
            expect(res.body.error).toBe('Server error');
        });

        test('Boolean name -> 500 (keine Matches)', async () => {
            const err = new Error('boom');
            err.name = true;
            const res = await request(appWith(err)).get('/t');
            expect(res.status).toBe(500);
        });


        test.each([
            [{ status: 'abc', message: 'string status' }, 500],
            [{ status: 42,   message: 'below 100' },     500],
            [{ status: 99,   message: 'edge below' },    500],
            [{ status: 600,  message: 'above 599' },     500],
            [{ statusCode: 0, message: 'statusCode invalid' }, 500],
        ])('invalid status -> 500 (%s)', async (errLike, expected) => {
            const a = makeAppWithErrFactory(errorHandler, () => Object.assign(new Error(errLike.message), errLike));
            const res = await request(a).get('/t');
            expect(res.status).toBe(expected);
            expect(res.body.error).toBe('Server error');
            expect(res.body.detail).toMatch(/(string status|below 100|edge below|above 599|statusCode invalid)/i);
        });

        test.each([
            [{ status: 404 }, 404],
            [{ statusCode: 401 }, 401],
            [{ status: 200 }, 200],
        ])('gültiger Status bleibt erhalten (%s)', async (errLike, expected) => {
            const a = makeAppWithErrFactory(errorHandler, () => Object.assign(new Error('kept'), errLike));
            const res = await request(a).get('/t');
            expect(res.status).toBe(expected);
            expect(res.body.error).toBe(expected >= 500 ? 'Server error' : 'Request error');
            expect(res.body.detail).toMatch(/kept/);
        });

        test.each([
            [{ name: 'AbortError' }, 504],
            [{ name: 'ABORTED' },    504],
            [{ name: 'TimeoutError' }, 504],
            [{ name: 'TIMEOUT' },      504],
        ])('name enthält abort/timeout -> 504 (%s)', async (errLike, expected) => {
            errLike.status = 403; // wird von 504 übersteuert
            const a = makeAppWithErrFactory(errorHandler, () => Object.assign(new Error('timed out'), errLike));
            const res = await request(a).get('/t');
            expect(res.status).toBe(expected);
            expect(res.body.error).toBe('Server error');
            expect(res.body.detail).toMatch(/timed out/i);
        });

        test('ohne name -> Default 500', async () => {
            const a = makeAppWithErrFactory(errorHandler, () => new Error('oops'));
            const res = await request(a).get('/t');
            expect(res.status).toBe(500);
            expect(res.body.error).toBe('Server error');
            expect(res.body.detail).toMatch(/oops/i);
        });
    });

    describe('payload.code handling', () => {
        test('setzt code in Nicht-Prod', async () => {
            process.env.NODE_ENV = 'test';
            jest.resetModules();
            const handler = require(HANDLER_PATH);

            const a = makeAppWithErrFactory(handler, () => {
                const err = new Error('validation failed');
                err.status = 400;
                err.code = 'E_VALIDATION';
                return err;
            });

            const res = await request(a).get('/t');
            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Request error');
            expect(res.body.detail).toMatch(/validation failed/i);
            expect(res.body.code).toBe('E_VALIDATION');
        });

        test('versteckt code in production', async () => {
            process.env.NODE_ENV = 'production';
            jest.resetModules();
            const handler = require(HANDLER_PATH);

            const a = makeAppWithErrFactory(handler, () => {
                const err = new Error('forbidden');
                err.status = 403;
                err.code = 'E_FORBIDDEN';
                return err;
            });

            const res = await request(a).get('/t');
            expect(res.status).toBe(403);
            expect(res.body.error).toBe('Request error');
            expect(res.body.detail).toBeUndefined();
            expect(res.body.code).toBeUndefined();
        });

        test('code nur bei truthy Werten', async () => {
            process.env.NODE_ENV = 'test';
            jest.resetModules();
            const handler = require(HANDLER_PATH);

            // A) code = 0 (falsy)
            let a = makeAppWithErrFactory(handler, () => {
                const e = new Error('bad request');
                e.status = 400;
                e.code = 0;
                return e;
            });
            let res = await request(a).get('/t');
            expect(res.status).toBe(400);
            expect(res.body.code).toBeUndefined();

            // B) code = "" (falsy)
            a = makeAppWithErrFactory(handler, () => {
                const e = new Error('bad request');
                e.status = 400;
                e.code = '';
                return e;
            });
            res = await request(a).get('/t');
            expect(res.status).toBe(400);
            expect(res.body.code).toBeUndefined();

            // C) code = 123 (truthy)
            a = makeAppWithErrFactory(handler, () => {
                const e = new Error('rate limited');
                e.status = 429;
                e.code = 123;
                return e;
            });
            res = await request(a).get('/t');
            expect(res.status).toBe(429);
            expect(res.body.code).toBe(123);
        });
    });
});
