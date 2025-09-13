import * as dotenv from 'dotenv'
dotenv.config();

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/wayfinder.db';
const ORS_BASE = 'https://api.openrouteservice.org';
const ORS_API_KEY = process.env.ORS_API_KEY || '';

const corsOptions = {
    origin: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
};

export { PORT, DB_PATH, ORS_BASE, ORS_API_KEY, corsOptions };
