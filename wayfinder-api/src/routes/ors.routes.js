const express = require('express');
const rateLimit = require('express-rate-limit');
const { autocomplete, geocode, directions } = require('../services/ors.service');

const router = express.Router();
router.use(rateLimit({ windowMs: 60_000, max: 120 }));

// kleine Helper
const toNum = v => (v === undefined ? undefined : Number(v));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

router.get('/autocomplete', async (req, res) => {
    const text = String(req.query.query || '').trim();
    if (!text) return res.status(400).json({ error: 'query erforderlich' });

    // optionale Query-Parameter → Pelias/ORS
    const q = { text };
    // Größe begrenzen (z. B. 1..20)
    const size = toNum(req.query.size);
    q.size = Number.isFinite(size) ? clamp(size, 1, 20) : 10;

    if (req.query.lang) q.lang = String(req.query.lang);                 // z.B. 'de'
    if (req.query.country) q['boundary.country'] = String(req.query.country); // z.B. 'CHE'

    const lat = toNum(req.query.lat);
    const lon = toNum(req.query.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        q['focus.point.lat'] = lat;
        q['focus.point.lon'] = lon;
    }

    if (req.query.layers) q.layers = String(req.query.layers);           // z.B. 'locality,region,address'

    const r = await autocomplete(q); // { ok, status, data }
    if (!r.ok) return res.status(r.status).json(typeof r.data === 'string' ? { error: r.data } : (r.data || { error: 'Upstream error' }));
    return res.status(200).json(r.data);
});

router.get('/geocode', async (req, res) => {
    const text = String(req.query.query || '').trim();
    if (!text) return res.status(400).json({ error: 'query erforderlich' });

    const q = { text };
    const size = toNum(req.query.size);
    q.size = Number.isFinite(size) ? clamp(size, 1, 20) : 10;

    if (req.query.lang) q.lang = String(req.query.lang);
    if (req.query.country) q['boundary.country'] = String(req.query.country);

    const lat = toNum(req.query.lat);
    const lon = toNum(req.query.lon);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        q['focus.point.lat'] = lat;
        q['focus.point.lon'] = lon;
    }

    if (req.query.layers) q.layers = String(req.query.layers);

    const r = await geocode(q);
    if (!r.ok) return res.status(r.status).json(typeof r.data === 'string' ? { error: r.data } : (r.data || { error: 'Upstream error' }));
    return res.status(200).json(r.data);
});

router.post('/directions', async (req, res) => {
    const { start, end, profile = 'driving-car' } = req.body || {};
    const okPair = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
    if (!okPair(start) || !okPair(end)) return res.status(400).json({ error: 'start/end als [lon,lat]' });

    const r = await directions(profile, start, end);
    if (!r.ok) return res.status(r.status).json(typeof r.data === 'string' ? { error: r.data } : (r.data || { error: 'Upstream error' }));

    const route = r.data?.routes?.[0];
    if (route?.geometry?.type === 'LineString') {
        return res.json({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: { distance: route.summary?.distance, duration: route.summary?.duration, profile },
                geometry: route.geometry
            }]
        });
    }
    return res.json(r.data);
});

module.exports = router;
