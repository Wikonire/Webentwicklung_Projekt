import express from 'express';
import rateLimit from 'express-rate-limit';
import { autocomplete, geocode, directions } from '../services/ors.service.js';

const router = express.Router();
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

const toNum = v => (v === undefined ? undefined : Number(v));
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
    'wheelchair'
]);


/** ---------- helpers: robust label builder + mapper ---------- */
function buildSuggestionLabel(properties) {
    if (typeof properties?.label === 'string' && properties.label.trim()) return properties.label;
    const candidates = [
        properties?.name,
        properties?.locality ?? properties?.localadmin ?? properties?.borough ?? properties?.county,
        properties?.region ?? properties?.state,
        properties?.country
    ];
    const parts = candidates
        .map(p =>
            typeof p === 'string' ? p
                : typeof p === 'number' ? String(p)
                    : (p && typeof p.label === 'string') ? p.label
                        : ''
        )
        .filter(Boolean);
    return parts.join(', ');
}

function mapFeatureToSuggestion(feature) {
    const lon = Number(feature?.geometry?.coordinates?.[0]);
    const lat = Number(feature?.geometry?.coordinates?.[1]);
    return {
        label: buildSuggestionLabel(feature?.properties ?? {}),
        coord: [lon, lat],
    };
}
/** ------------------------------------------------------------ */

router.get('/autocomplete', async (req, res) => {
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

    const upstream = await autocomplete(queryToOrs);
    if (!upstream.ok) {
        return res.status(upstream.status).json(typeof upstream.data === 'string' ? { error: upstream.data } : (upstream.data || { error: 'Upstream error' }));
    }
    const features = Array.isArray(upstream.data?.features) ? upstream.data.features : [];
    const suggestions = features.map(mapFeatureToSuggestion);
    return res.status(200).json({ features: suggestions });
});

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
        return res.status(upstream.status).json(typeof upstream.data === 'string' ? { error: upstream.data } : (upstream.data || { error: 'Upstream error' }));
    }
    const features = Array.isArray(upstream.data?.features) ? upstream.data.features : [];
    const suggestions = features.map(mapFeatureToSuggestion);
    return res.status(200).json({ features: suggestions });
});

router.post('/directions', async (req, res) => {
    const { start, end, profile = 'driving-car' } = req.body || {};
    const isLngLat = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
    if (!isLngLat(start) || !isLngLat(end)) return res.status(400).json({ error: 'start/end als [lon,lat]' });

    const effectiveProfile = String(profile);
    if (!allowedProfiles.has(effectiveProfile)) {
        return res.status(400).json({ error: `profile muss eines von ${Array.from(allowedProfiles).join(', ')} sein` });
    }

    const upstream = await directions(effectiveProfile, start, end);
    if (!upstream.ok) {
        return res.status(upstream.status).json(typeof upstream.data === 'string' ? { error: upstream.data } : (upstream.data || { error: 'Upstream error' }));
    }

    const route = upstream.data?.routes?.[0];
    if (route?.geometry?.type === 'LineString') {
        // ✔ Immer FeatureCollection mit summary.{distance,duration} zurückgeben
        return res.json({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    summary: { distance: route.summary?.distance, duration: route.summary?.duration },
                    profile: effectiveProfile
                },
                geometry: route.geometry
            }]
        });
    }

    if (upstream.data?.type === 'FeatureCollection') {
        return res.json(upstream.data);
    }

    return res.json({ type: 'FeatureCollection', features: [] });
});

export default router;
