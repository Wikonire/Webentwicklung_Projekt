import express from 'express';
import rateLimit from 'express-rate-limit';
import { autocomplete, geocode, directions } from '../services/ors.service.js';
import polyline from '@mapbox/polyline';

export const router = express.Router();
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

/** -------------------- Hilfsfunktionen -------------------- */
export const toNumber = (value) =>
    value === undefined ? undefined : Number(value);

export const clampNumber = (value, min, max) =>
    Math.min(max, Math.max(min, value));

export const allowedProfiles = new Set([
    'driving-car',
    'driving-hgv',
    'cycling-regular',
    'cycling-road',
    'cycling-mountain',
    'cycling-electric',
    'foot-walking',
    'foot-hiking',
    'wheelchair',
]);

const allowedLayers = new Set([
    'address',
    'street',
    'locality',
    'localadmin',
    'county',
    'macrocounty',
    'region',
    'macroregion',
    'country',
    'continent',
    'venue'
]);

export function mapFeatureToSuggestion(feature) {
    return {
        id: feature?.properties?.id ?? null,
        label: feature?.properties?.label ?? 'Unbekannt',
        coord: [
            Number(feature?.geometry?.coordinates?.[0]),
            Number(feature?.geometry?.coordinates?.[1]),
        ],
    };
}

export function isLngLat(candidate) {
    return (
        Array.isArray(candidate) &&
        candidate.length === 2 &&
        Number.isFinite(Number(candidate[0])) &&
        Number.isFinite(Number(candidate[1]))
    );
}

export function normalizeLngLat(coordPair) {
    return [Number(coordPair[0]), Number(coordPair[1])];
}

export function prepareQueryToOrs(baseQuery, req, defaultSize = 10, defaultLayers = 'address,street,locality,venue') {
    // layers prüfen
    if (req.query.layers) {
        const layerError = validateLayers(req.query.layers);
        if (layerError) {
            throw new Error(layerError); // wirf Fehler → Endpoint fängt das ab
        }
        baseQuery.layers = String(req.query.layers);
    } else {
        baseQuery.layers = defaultLayers;
    }

    // size
    const requestedSize = toNumber(req.query.size);
    baseQuery.size = Number.isFinite(requestedSize)
        ? clampNumber(requestedSize, 1, 30)
        : defaultSize;

    // Sprache, Land
    if (req.query.lang) baseQuery.lang = String(req.query.lang);
    if (req.query.country) baseQuery['boundary.country'] = String(req.query.country);

    // Fokus-Punkt
    const latitude = toNumber(req.query.lat);
    const longitude = toNumber(req.query.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        baseQuery['focus.point.lat'] = latitude;
        baseQuery['focus.point.lon'] = longitude;
    }

    return baseQuery;
}

export function sendSuggestionResponse(upstreamResponse, res) {
    if (!upstreamResponse.ok) {
        console.error('ORS error:', upstreamResponse);
        return res.status(upstreamResponse.status).json(
            typeof upstreamResponse.data === 'string'
                ? { error: upstreamResponse.data }
                : upstreamResponse.data || { error: 'Upstream error' }
        );
    }

    const features = Array.isArray(upstreamResponse.data?.features)
        ? upstreamResponse.data.features
        : [];

    const suggestions = features.map(mapFeatureToSuggestion);
    return res.status(200).json({ suggestions });
}

/** -------------------- DTO-Validator -------------------- */
export function validateDirectionsDto(body) {
    if (!isLngLat(body.start)) return 'start muss [lon,lat] (Zahlen) sein';
    if (!isLngLat(body.end)) return 'end muss [lon,lat] (Zahlen) sein';
    if (!isValidCoord(body.start)) return 'start muss <= -180 und <=180 sein';
    if (!isValidCoord(body.end)) return 'end muss <= -180 und <=180 sein';
    if (!allowedProfiles.has(body.profile)) {
        return `${body.profile} ist kein gültiges Profil. Gültig: ${Array.from(
            allowedProfiles
        ).join(', ')}`;
    }
    return null;
}

export function isValidCoord(coord) {
    return Array.isArray(coord)
        && coord.length === 2
        && coord[0] >= -180 && coord[0] <= 180
        && coord[1] >= -90 && coord[1] <= 90;
}

/**
 * Prüft, ob ein übergebener layers-String gültig ist.
 * @param {string} layersString
 * @returns {string|null}  Fehlertext oder null, wenn gültig
 */
export function validateLayers(layersString) {
    if (typeof layersString !== 'string' || !layersString.trim()) {
        return 'layers muss ein nicht-leerer String sein';
    }

    const layers = layersString.split(',').map(l => l.trim());
    for (const layer of layers) {
        if (!allowedLayers.has(layer)) {
            return `Ungültiger Layer: '${layer}'. Erlaubt: ${Array.from(allowedLayers).join(', ')}`;
        }
    }
    return null;
}

/** --------------------------- Routes --------------------------- */

// Autocomplete
router.get('/autocomplete', async (req, res) => {
    const queryText = String(req.query.query || '').trim();
    if (!queryText) return res.status(400).json({ error: 'query erforderlich' });

    const orsQuery = prepareQueryToOrs({ text: queryText }, req, 20, 'address,street,locality,venue,localadmin,coarse,borough');
    const upstreamResponse = await autocomplete(orsQuery);
    return sendSuggestionResponse(upstreamResponse, res);
});

// Geocode
router.get('/geocode', async (req, res) => {
    const queryText = String(req.query.query || '').trim();
    if (!queryText) return res.status(400).json({ error: 'query erforderlich' });

    const orsQuery = prepareQueryToOrs({ text: queryText }, req, 10);
    const upstreamResponse = await geocode(orsQuery);
    return sendSuggestionResponse(upstreamResponse, res);
});

// Directions
router.post('/directions', async (req, res) => {
    const validationError = validateDirectionsDto(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    const { start, end, profile } = req.body;
    const startCoord = normalizeLngLat(start);
    const endCoord = normalizeLngLat(end);
    const upstreamResponse = await directions(profile, startCoord, endCoord);

    if (!upstreamResponse.ok) {
        console.error('Directions error:', upstreamResponse);
        return res.status(upstreamResponse.status).json(
            typeof upstreamResponse.data === 'string'
                ? { error: upstreamResponse.data }
                : upstreamResponse.data ||
                { error: 'Upstream error' }
        );
    }

    const route = upstreamResponse.data?.routes?.[0];
    if (route?.geometry && typeof route.geometry === 'string') {
        // Polyline → GeoJSON
        const coords = polyline.decode(route.geometry).map(([lat, lon]) => [lon, lat]);
        return res.json({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: { summary: route.summary, profile },
                    geometry: { type: 'LineString', coordinates: coords },
                },
            ],
        });
    }

    if (upstreamResponse.data?.type === 'FeatureCollection') {
        return res.json(upstreamResponse.data);
    }

    return res.json({ type: 'FeatureCollection', features: [] });
});

export default router;
