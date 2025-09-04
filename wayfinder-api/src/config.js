import * as dotenv from 'dotenv'
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const DB_PATH = process.env.DB_PATH || './data/wayfinder.db';
export const ORS_BASE = 'https://api.openrouteservice.org';
export const ORS_API_KEY = process.env.ORS_API_KEY || '';

export const corsOptions = {
    origin: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
};

export default { PORT, DB_PATH, ORS_BASE, ORS_API_KEY, corsOptions };
