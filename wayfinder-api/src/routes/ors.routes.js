import express from 'express';
import rateLimit from 'express-rate-limit';
import { autocomplete, geocode, directions } from '../services/ors.service.js';
import polyline from '@mapbox/polyline';

const router = express.Router();
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

const toNum = (v) => (v === undefined ? undefined : Number(v));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const allowedProfiles = new Set([
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

function mapFeatureToSuggestion(feature) {
    return {
        id: feature?.properties?.id,
        label: feature.properties?.label,
        coord: [
            Number(feature?.geometry?.coordinates?.[0]),
            Number(feature?.geometry?.coordinates?.[1]),
        ],
    };
}

function isLngLat(p) {
    return Array.isArray(p) && p.length === 2 && !isNaN(Number(p[0])) && !isNaN(Number(p[1]));
}
function normalizeLngLat(p) {
    return [Number(p[0]), Number(p[1])];
}

/** --------------------------- autocomplete --------------------------- */
router.get('/autocomplete', async (req, res) => {
    const text = String(req.query.query || '').trim();
    if (!text) return res.status(400).json({ error: 'query erforderlich' });

    const queryToOrs = { text };
    const requestedSize = toNum(req.query.size);
    queryToOrs.size = Number.isFinite(requestedSize) ? clamp(requestedSize, 1, 30) : 20;

    if (req.query.lang) queryToOrs.lang = String(req.query.lang);
    if (req.query.country) queryToOrs['boundary.country'] = String(req.query.country);

    const lat = toNum(req.query.lat);
    const lon = toNum(req.query.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        queryToOrs['focus.point.lat'] = lat;
        queryToOrs['focus.point.lon'] = lon;
    }
    if (req.query.layers) queryToOrs.layers = String(req.query.layers);

    const upstream = await autocomplete(queryToOrs);
    if (!upstream.ok) {
        return res
            .status(upstream.status)
            .json(typeof upstream.data === 'string' ? { error: upstream.data } : upstream.data || { error: 'Upstream error' });
    }

    const features = Array.isArray(upstream.data?.features) ? upstream.data.features : [];
    const suggestions = features.map(mapFeatureToSuggestion);
    return res.status(200).json({ suggestions });
});

/** --------------------------- geocode --------------------------- */
router.get('/geocode', async (req, res) => {
    const text = String(req.query.query || '').trim();
    if (!text) return res.status(400).json({ error: 'query erforderlich' });

    const queryToOrs = { text };
    const requestedSize = toNum(req.query.size);
    queryToOrs.size = Number.isFinite(requestedSize) ? clamp(requestedSize, 1, 20) : 10;

    if (req.query.lang) queryToOrs.lang = String(req.query.lang);
    if (req.query.country) queryToOrs['boundary.country'] = String(req.query.country);

    const lat = toNum(req.query.lat);
    const lon = toNum(req.query.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        queryToOrs['focus.point.lat'] = lat;
        queryToOrs['focus.point.lon'] = lon;
    }
    if (req.query.layers) queryToOrs.layers = String(req.query.layers);

    const upstream = await geocode(queryToOrs);
    if (!upstream.ok) {
        return res
            .status(upstream.status)
            .json(typeof upstream.data === 'string' ? { error: upstream.data } : upstream.data || { error: 'Upstream error' });
    }

    const features = Array.isArray(upstream.data?.features) ? upstream.data.features : [];
    const suggestions = features.map(mapFeatureToSuggestion);
    return res.status(200).json({ suggestions });
});

/** --------------------------- directions --------------------------- */
router.post('/directions', async (req, res) => {
    const { start, end, profile = 'driving-car' } = req.body || {};

    if (!isLngLat(start) || !isLngLat(end)) {
        return res.status(400).json({ error: 'start/end müssen [lon,lat] (Zahlen) sein' });
    }

    const startCoord = normalizeLngLat(start);
    const endCoord = normalizeLngLat(end);

    const effectiveProfile = String(profile);
    if (!allowedProfiles.has(effectiveProfile)) {
        return res.status(400).json({
            error: `profile muss eines von ${Array.from(allowedProfiles).join(', ')} sein`,
        });
    }

    const upstream = await directions(effectiveProfile, startCoord, endCoord);
    if (!upstream.ok) {
        return res
            .status(upstream.status)
            .json(typeof upstream.data === 'string' ? { error: upstream.data } : upstream.data || { error: 'Upstream error' });
    }

    const route = upstream.data?.routes?.[0];
    if (route?.geometry && typeof route.geometry === 'string') {
        // 👉 Polyline → GeoJSON LineString
        const coords = polyline.decode(route.geometry).map(([lat, lon]) => [lon, lat]);

        return res.json({
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        summary: route.summary,
                        profile: effectiveProfile,
                    },
                    geometry: {
                        type: 'LineString',
                        coordinates: coords,
                    },
                },
            ],
        });
    }

    if (upstream.data?.type === 'FeatureCollection') {
        return res.json(upstream.data);
    }

    return res.json({ type: 'FeatureCollection', features: [] });
});

export default router;
