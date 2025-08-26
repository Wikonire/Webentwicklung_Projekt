const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const { OPENAPI } = require('./openapi');
const { corsOptions } = require('./config');
const orsRouter = require('./routes/ors.routes');
const routesRouter = require('./routes/routes.routes');
const errorHandler = require('./middlewares/error-handler');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors(corsOptions));
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.get('/', (_, res) => res.send('Wayfinder API läuft. Swagger: /api'));
app.get('/healthz', (_, res) => res.json({ ok: true, uptime: process.uptime() }));

app.use('/api', swaggerUi.serve, swaggerUi.setup(OPENAPI));
app.use('/ors', orsRouter);
app.use('/routes', routesRouter);

app.use(errorHandler); // letzter Middleware

module.exports = app;
