// zwinge alle fetch-Calls durch node-fetch (nock kann das abfangen)
global.fetch = require('node-fetch');
// Swagger-UI in Tests stummschalten (optional)
jest.mock('swagger-ui-express', () => {
    const mw = (_req, _res, next) => next();
    return { serve: [mw], setup: () => mw };
});
