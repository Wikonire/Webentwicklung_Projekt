import { ORS_BASE, ORS_API_KEY } from '../config.js';
import fetch from 'node-fetch';

/**
 * Baut Querystring aus Key/Value-Paaren. Ignoriert null/undefined.
 */
export function toQueryString(params) {
    const usp = new URLSearchParams();
    for (const [paramName, rawValue] of Object.entries(params || {})) {
        if (rawValue === undefined || rawValue === null) continue;
        usp.append(paramName, String(rawValue));
    }
    return usp.toString();
}

/**
 * Liest Response sicher als JSON; fällt auf Text zurück.
 */
export async function readJsonSafe(res) {
    const text = await res.text();
    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return text || null;
    }
}



/**
 * ---- Öffentliche Funktionen: akzeptieren PARAMETER-OBJEKTE ----
 * Diese Signaturen passen zur Nutzung im Router:
 *   const upstream = await autocomplete(orsParams);
 *   const upstream = await geocode(orsParams);
 *   const upstream = await directions(profile, start, end);
 */

// Pelias Autocomplete
export function autocomplete(params /* {text, size, lang, 'boundary.country', layers, 'focus.point.lat', 'focus.point.lon', ... } */) {
    return orsFetch('/geocode/autocomplete', { query: params });
}

// Pelias Search
export function geocode(params /* {text, size, lang, 'boundary.country', layers, 'focus.point.lat', 'focus.point.lon', ... } */) {
    return orsFetch('/geocode/search', { query: params });
}

// Directions v2
export function directions(profile, startLngLat, endLngLat) {
    return orsFetch(`/v2/directions/${encodeURIComponent(profile)}`, {
        method: 'POST',
        body: {
            coordinates: [startLngLat, endLngLat],
            instructions: false
        }
    });
}


/**
 * Gemeinsamer Fetch-Helper gegen ORS.
 * - Header `Authorization: <API_KEY>` ist bei ORS korrekt (kein "Bearer").
 * - method: GET/POST
 * - query: Objekt mit Query-Parametern (z.B. { text, size, lang, 'boundary.country': 'CHE' })
 * - body: wird JSON-stringified, wenn gesetzt
 */
export async function orsFetch(path, { method = 'GET', query, body } = {}) {
    if (!ORS_API_KEY) {
        return { ok: false, status: 500, data: 'Missing ORS_API_KEY' };
    }
    const url = new URL(`${ORS_BASE}${path}`);
    if (query) {
        const qs = toQueryString(query);
        if (qs) url.search = qs;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
        const res = await fetch(url, {
            method,
            headers: {
                Accept: 'application/json',
                Authorization: ORS_API_KEY, // wichtig: kein Bearer
                ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal
        });

        clearTimeout(timeout);

        const data = await readJsonSafe(res);
        return { ok: res.ok, status: res.status, data };
    } catch (err) {
        return { ok: false, status: 502, data: `Network error: ${err.message}` };
    }
}

