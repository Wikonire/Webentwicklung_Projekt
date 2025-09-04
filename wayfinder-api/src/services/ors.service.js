import { ORS_BASE, ORS_API_KEY } from '../config.js';
import fetch from 'node-fetch';

export async function orsFetch(path, { method='GET', query, body } = {}) {
    const url = new URL(`${ORS_BASE}${path}`);
    if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));

    const res = await fetch(url, {
        method,
        headers: {
            Authorization: ORS_API_KEY, // kein "Bearer"
            ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text || null; }

    return { ok: res.ok, status: res.status, data };
}

export const autocomplete = (text) => orsFetch('/geocode/autocomplete', { query: { text } });
export const geocode      = (text) => orsFetch('/geocode/search',       { query: { text } });
export const directions   = (profile, start, end) =>
    orsFetch(`/v2/directions/${encodeURIComponent(profile)}`, {
        method: 'POST',
        body: { coordinates: [start, end], geometry_format: 'geojson', instructions: false }
    });

