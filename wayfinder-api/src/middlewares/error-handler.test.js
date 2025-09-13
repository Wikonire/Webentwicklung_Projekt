// error-handler.test.js
import errorHandler from './error-handler.js';
import {jest} from "@jest/globals";

describe('errorHandler', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            headersSent: false,
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
        jest.spyOn(console, 'error').mockImplementation(() => {});
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('wenn Response bereits gesendet wurde', () => {
        test('ruft next mit dem Fehler auf', () => {
            mockRes.headersSent = true;
            const testError = new Error('already sent');
            errorHandler(testError, mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(testError);
        });
    });

    describe('Logging Verhalten', () => {
        test('loggt Fehler in development', () => {
            const testError = new Error('log me');
            errorHandler(testError, mockReq, mockRes, mockNext);
            expect(console.error).toHaveBeenCalledWith(testError);
        });

        test('loggt Fehler nicht in test', () => {
            process.env.NODE_ENV = 'test';
            const testError = new Error('dont log me');
            errorHandler(testError, mockReq, mockRes, mockNext);
            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe('Syntaxfehler / entity.parse.failed', () => {
        test('gibt 400 mit Invalid JSON body zurück bei SyntaxError', () => {
            const syntaxError = new SyntaxError('invalid');
            errorHandler(syntaxError, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid JSON body' });
        });

        test('gibt 400 mit Invalid JSON body zurück bei entity.parse.failed', () => {
            const parseError = { type: 'entity.parse.failed' };
            errorHandler(parseError, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid JSON body' });
        });
    });

    describe('Statuscode Handling', () => {
        test('setzt Status auf err.status', () => {
            const err = { status: 404, message: 'not found' };
            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        test('fällt zurück auf 500 wenn ungültiger Status', () => {
            const err = { status: 9999, message: 'invalid' };
            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('Timeout/Abort Handling', () => {
        test('setzt Status 504 bei Timeout im Namen', () => {
            const err = { name: 'TimeoutError', message: 'timed out' };
            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(504);
        });

        test('setzt Status 504 bei Abort im Namen', () => {
            const err = { name: 'AbortError', message: 'aborted' };
            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(504);
        });
    });

    describe('Payload Struktur', () => {
        test('setzt error auf "Server error" bei 500', () => {
            const err = { status: 500, message: 'server kaputt' };
            errorHandler(err, mockReq, mockRes, mockNext);
            const [payload] = mockRes.json.mock.calls[0];
            expect(payload.error).toBe('Server error');
        });

        test('setzt error auf "Request error" bei 400', () => {
            const err = { status: 400, message: 'bad req' };
            errorHandler(err, mockReq, mockRes, mockNext);
            const [payload] = mockRes.json.mock.calls[0];
            expect(payload.error).toBe('Request error');
        });

        test('fügt detail hinzu wenn nicht production', () => {
            const err = { status: 400, message: 'bad req' };
            errorHandler(err, mockReq, mockRes, mockNext);
            const [payload] = mockRes.json.mock.calls[0];
            expect(payload.detail).toBe('bad req');
        });

        test('entfernt detail in production', async () => {
            process.env.NODE_ENV = 'production';
            jest.resetModules(); // Modulcache leeren
            const { default: errorHandlerProd } = await import('./error-handler.js');

            const mockReq = {};
            const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const mockNext = jest.fn();

            const err = { status: 400, message: 'bad req' };
            errorHandlerProd(err, mockReq, mockRes, mockNext);

            const [payload] = mockRes.json.mock.calls[0];
            expect(payload.detail).toBeUndefined();
        });

    });
});
