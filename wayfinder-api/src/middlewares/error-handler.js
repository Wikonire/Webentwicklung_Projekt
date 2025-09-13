const isProd = process.env.NODE_ENV === 'production';
/**
 * Express Error Handler Middleware
 *
 * @function
 * @param {Error} err - Das Fehlerobjekt, das von vorherigen Middleware-/Route-Handlern weitergegeben wird
 * @param {import('express').Request} req - Express Request Objekt
 * @param {import('express').Response} res - Express Response Objekt
 * @param {import('express').NextFunction} next - Callback, um zum nächsten Middleware-Handler zu gehen
 *
 * @summary
 * Wandelt interne Fehler in eine einheitliche JSON-Antwort um.
 * - Unterscheidet zwischen Client-Fehlern (4xx) und Server-Fehlern (5xx).
 * - Erkennt Syntax- und Timeout-Fehler speziell.
 * - In Dev/Test werden Details im Response mitgesendet, in Production bleiben sie verborgen.
 *
 * @returns {void} Antwortet mit einer JSON-Struktur und beendet die Response.
 * @throws {Error} Falls die Response bereits gesendet wurde (`res.headersSent`).
 *
 * @example
 * import errorHandler from './middlewares/error-handler.js';
 * app.use(errorHandler);
 */
export default (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (process.env.NODE_ENV !== 'test') {
        console.error(err);
    }

    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    let status = Number(err.status || err.statusCode || 500);
    if (!Number.isInteger(status) || status < 100 || status > 599) status = 500;

    const name = String(err.name ?? '');
    const lowerCaseName = name.toLowerCase();
    if (lowerCaseName.includes('abort') || lowerCaseName.includes('timeout')) {
        status = 504;
    }

    const payload = {
        error: status >= 500 ? 'Server error' : 'Request error',
    };

    if (!isProd) {
        payload.detail = err.message;
        if (err.code) payload.code = err.code;
    }

    res.status(status).json(payload);
};
