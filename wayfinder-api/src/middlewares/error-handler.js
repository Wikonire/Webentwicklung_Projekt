const isProd = process.env.NODE_ENV === 'production';

module.exports = (err, req, res, next) => {
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
