const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

// --- Config ---
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/wayfinder.db';
const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// --- DB ---
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS routes (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT,
    startLat REAL NOT NULL,
    startLng REAL NOT NULL,
    endLat REAL NOT NULL,
    endLng REAL NOT NULL,
    distance INTEGER,
    duration INTEGER,
    geometry TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )
`).run();

// --- App ---
const app = express();
app.use(express.json({ limit: '1mb' }));
// @ts-ignore
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.get('/', (req, res) => {
    res.send('Wayfinder API läuft. Swagger: /api');
});

app.get('/healthz', (req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
});
// --- Utils ---
const uuid = () => (require('crypto').randomUUID());
const bad = (msg) => ({ error: msg });
function validateRoute(b) {
    const req = ['userId','startLat','startLng','endLat','endLng','geometry'];
    for (const k of req) if (b[k] === undefined) return `${k} fehlt`;
    for (const n of ['startLat','startLng','endLat','endLng'])
        if (typeof b[n] !== 'number') return `${n} muss number sein`;
    return null;
}

// --- REST: /routes ---
app.post('/routes', (req, res) => {
    const err = validateRoute(req.body);
    if (err) return res.status(400).json(bad(err));

    const id = uuid();
    db.prepare(`
    INSERT INTO routes (id,userId,name,startLat,startLng,endLat,endLng,distance,duration,geometry)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
        id,
        req.body.userId,
        req.body.name ?? null,
        req.body.startLat, req.body.startLng,
        req.body.endLat,  req.body.endLng,
        req.body.distance ?? null,
        req.body.duration ?? null,
        JSON.stringify(req.body.geometry)
    );
    const row = db.prepare('SELECT * FROM routes WHERE id = ?').get(id);
    row.geometry = JSON.parse(row.geometry);
    res.status(201).json(row);
});

app.get('/routes', (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json(bad('userId erforderlich'));
    const rows = db.prepare(
        'SELECT * FROM routes WHERE userId = ? ORDER BY createdAt DESC'
    ).all(userId);
    rows.forEach(r => r.geometry = JSON.parse(r.geometry));
    res.json(rows);
});

app.get('/routes/:id', (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json(bad('userId erforderlich'));
    const row = db.prepare(
        'SELECT * FROM routes WHERE id = ? AND userId = ?'
    ).get(req.params.id, userId);
    if (!row) return res.sendStatus(404);
    row.geometry = JSON.parse(row.geometry);
    res.json(row);
});

app.delete('/routes/:id', (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json(bad('userId erforderlich'));
    const info = db.prepare(
        'DELETE FROM routes WHERE id = ? AND userId = ?'
    ).run(req.params.id, userId);
    if (info.changes === 0) return res.sendStatus(404);
    res.sendStatus(204);
});

// --- Swagger ---
const swaggerUi = require('swagger-ui-express');
const openapi = {
    openapi: '3.0.0',
    info: { title: 'Wayfinder API', version: '1.0.0' },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
        schemas: {
            CreateRouteDto: {
                type: 'object',
                required: ['userId','startLat','startLng','endLat','endLng','geometry'],
                properties: {
                    userId: { type: 'string' },
                    name: { type: 'string', nullable: true },
                    startLat: { type: 'number' },
                    startLng: { type: 'number' },
                    endLat: { type: 'number' },
                    endLng: { type: 'number' },
                    distance: { type: 'integer', nullable: true },
                    duration: { type: 'integer', nullable: true },
                    geometry: { type: 'object' } // GeoJSON oder polyline-Objekt
                }
            },
            Route: {
                allOf: [
                    { $ref: '#/components/schemas/CreateRouteDto' },
                    {
                        type: 'object',
                        required: ['id','createdAt'],
                        properties: {
                            id: { type: 'string' },
                            createdAt: { type: 'string', description: 'ISO/SQLite Timestamp' }
                        }
                    }
                ]
            }
        }
    },
    paths: {
        '/routes': {
            get: {
                summary: 'Alle Routen eines Nutzers',
                parameters: [{ name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': {
                        description: 'OK',
                        content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Route' } } } }
                    },
                    '400': { description: 'Bad Request' }
                }
            },
            post: {
                summary: 'Neue Route speichern',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRouteDto' } } }
                },
                responses: {
                    '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Route' } } } },
                    '400': { description: 'Bad Request' }
                }
            }
        },
        '/routes/{id}': {
            get: {
                summary: 'Route lesen',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Route' } } } },
                    '404': { description: 'Not Found' }
                }
            },
            delete: {
                summary: 'Route löschen',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
                ],
                responses: { '204': { description: 'Deleted' }, '404': { description: 'Not Found' } }
            }
        }
    }
};

app.use('/api', swaggerUi.serve);
app.get('/api', swaggerUi.setup(openapi));

// --- Start ---
if (require.main === module) {
    app.listen(PORT, () =>
        console.log(`Wayfinder API läuft auf http://localhost:${PORT}/api  (Swagger: /api)`)
    );
}
module.exports = app; // für Tests
