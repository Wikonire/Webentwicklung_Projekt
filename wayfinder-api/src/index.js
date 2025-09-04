import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { OPENAPI } from './openapi.js';
import { corsOptions } from './config.js';
import orsRouter from './routes/ors.routes.js';
import routesRouter from './routes/routes.routes.js';
import errorHandler from './middlewares/error-handler.js';

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

export default app;
