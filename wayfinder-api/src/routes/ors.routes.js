import express from 'express';
import rateLimit from 'express-rate-limit';
import { autocomplete, geocode, directions, sendUpstreamError } from '../services/ors.service.js';
import polyline from '@mapbox/polyline';
import {clampNumber, toNumber} from "../validators/shared.validators.js";

export const router = express.Router();
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

/** -------------------- Hilfsfunktionen -------------------- */
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
        return sendUpstreamError(upstreamResponse, res);
    }

    const features = Array.isArray(upstreamResponse.data?.features)
        ? upstreamResponse.data.features
        : [];

    const suggestions = features.map(mapFeatureToSuggestion);
    return res.status(200).json({ suggestions });
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

router.get('/autocomplete', async (req, res) => {
    const queryText = String(req.query.query || '').trim();
    if (!queryText) return res.status(400).json({ error: 'query erforderlich' });

    const orsQuery = prepareQueryToOrs({ text: queryText }, req, 20, 'address,street,locality,venue,localadmin,coarse,borough');
    const upstreamResponse = await autocomplete(orsQuery);
    return sendSuggestionResponse(upstreamResponse, res);
});

router.get('/geocode', async (req, res) => {
    const queryText = String(req.query.query || '').trim();
    if (!queryText) return res.status(400).json({ error: 'query erforderlich' });

    const orsQuery = prepareQueryToOrs({ text: queryText }, req, 10);
    const upstreamResponse = await geocode(orsQuery);
    return sendSuggestionResponse(upstreamResponse, res);
});

// Directions
router.post('/directions', async (req, res) => {
    const { start, end, profile } = req.body;

    // ... DTO Validation ...

    const upstreamResponse = await directions(profile, start, end);

    if (!upstreamResponse.ok) {
        const data = upstreamResponse.data;
        if (typeof data === 'string') return res.status(upstreamResponse.status).json({ error: data });
        if (data && typeof data === 'object' && data.error)
            return res.status(upstreamResponse.status).json({ error: data.error });
        return res.status(upstreamResponse.status).json({ error: 'Upstream error' });
    }

    const data = upstreamResponse.data;

    // Fall 1: ORS liefert bereits GeoJSON FeatureCollection
    if (data.type === 'FeatureCollection') {
        return res.json({
            ...data,
            distance: data.features?.[0]?.properties?.summary?.distance ?? 0,
            duration: data.features?.[0]?.properties?.summary?.duration ?? 0,
        });
    }

    // Fall 2: ORS liefert klassische `routes[]`
    if (Array.isArray(data.routes)) {
        const route = data.routes[0];
        const coords = polyline.decode(route.geometry).map(([lat, lon]) => [lon, lat]);
        return res.json({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: coords },
                    properties: { summary: route.summary },
                },
            ],
            distance: route.summary?.distance ?? 0,
            duration: route.summary?.duration ?? 0,
        });
    }

    // Fallback: keine Daten
    return res.json({ type: 'FeatureCollection', features: [], distance: 0, duration: 0 });
});
export default router;
