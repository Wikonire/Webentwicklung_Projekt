import express from 'express';
import repo from '../repos/routes.repo.js';
import { validateCreateRoute } from '../validators/routes.validators.js';
import {directions} from "../services/ors.service.js";
import polyline from '@mapbox/polyline';

const router = express.Router();

// Favorit hinzufügen
router.post('/', async (req, res) => {
    const userId = 'u1'; // fix für jetzt
    const { startCoord, destinationCoord, startLabel, destinationLabel, profile } = req.body;
    const err = validateCreateRoute(req.body);
    if (err) {
        return res.status(400).json({ error: err });
    }

    try {

        const upstreamResponse = await directions(profile, startCoord, destinationCoord);

        if (!upstreamResponse.ok) {
            return res.status(upstreamResponse.status).json({
                error: upstreamResponse.data?.error?.message || 'Fehler bei ORS Directions',
                code: upstreamResponse.data?.error?.code
            });
        }

        const geoJson = orsToGeoJson(upstreamResponse.data);
        const payload = {
            id: crypto.randomUUID(),
            userId,
            startLabel,
            destinationLabel,
            startCoord,
            distance: geoJson.features[0].properties.summary?.distance ?? null,
            duration: geoJson.features[0].properties.summary?.duration ?? null,
            destinationCoord,
            profile,
            geometry: geoJson // FeatureCollection von ORS
        };

        const row = repo.insert(payload);
        return res.status(201).json(row);
    } catch (error) {
        return res.status(500).json({ error: 'Interner Fehler beim Speichern der Route' });
    }
});

function orsToGeoJson(orsData) {
    if (orsData.type === 'FeatureCollection') {
        return orsData; // ORS v1 liefert schon GeoJSON
    }

    if (Array.isArray(orsData.routes)) {
        const route = orsData.routes[0];
        const coords = polyline.decode(route.geometry).map(([lat, lon]) => [lon, lat]);

        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    },
                    properties: {
                        summary: route.summary
                    }
                }
            ]
        };
    }

    throw new Error('Unbekanntes ORS-Format');
}


// alle Routen von u1 auflisten
router.get('/', (req, res) => {
    const userId = 'u1';
    res.json(repo.listByUser(userId));
});

// einzelne Route von u1 abrufen
router.get('/:id', (req, res) => {
    const userId = 'u1';
    const row = repo.getOne(req.params.id, userId);
    if (!row) {
        return res.sendStatus(404);
    }
    res.json(row);
});

// Route von u1 löschen
router.delete('/:id', (req, res) => {
    const userId = 'u1';
    const ok = repo.remove(req.params.id, userId);
    if (!ok) {
        return res.sendStatus(404);
    }
    res.sendStatus(204);
});

export default router;
