const PORT = process.env.PORT || 3000;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

/* ---------- Schemas ---------- */
const ErrorSchema = {
    type: 'object',
    properties: {
        error: { type: 'string' },
        detail: { type: 'string' },
        code: { oneOf: [{ type: 'string' }, { type: 'number' }] }
    }
};

// Profil-Auswahl wie im Backend validiert
const OrsProfile = {
    type: 'string',
    enum: ['driving-car', 'foot-walking'],
    example: 'driving-car'
};

// Normalisierte Suggestion (so liefert dein Backend Autocomplete/Geocode)
const Suggestion = {
    type: 'object',
    required: ['label', 'coord'],
    properties: {
        label: { type: 'string' },
        coord: {
            type: 'array',
            minItems: 2,
            maxItems: 2,
            items: { type: 'number' },
            description: '[lon, lat]'
        }
    },
    example: { label: 'Zürich, CHE', coord: [8.5417, 47.3769] }
};

const GeoJSONLineString = {
    type: 'object',
    required: ['type', 'coordinates'],
    properties: {
        type: { const: 'LineString' },
        coordinates: {
            type: 'array',
            items: { type: 'array', items: { type: 'number' }, minItems: 2 },
            minItems: 2
        }
    }
};

// WICHTIG: summary.{distance,duration} statt distance/duration auf Root
const FeatureCollectionLineString = {
    type: 'object',
    required: ['type', 'features'],
    properties: {
        type: { const: 'FeatureCollection' },
        features: {
            type: 'array',
            items: {
                type: 'object',
                required: ['type', 'geometry', 'properties'],
                properties: {
                    type: { const: 'Feature' },
                    geometry: GeoJSONLineString,
                    properties: {
                        type: 'object',
                        properties: {
                            profile: { $ref: '#/components/schemas/OrsProfile' },
                            summary: {
                                type: 'object',
                                properties: {
                                    distance: { type: 'number', description: 'Meter' },
                                    duration: { type: 'number', description: 'Sekunden' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

export const OPENAPI = {
    openapi: '3.0.3',
    info: { title: 'Wayfinder API', version: '1.1.0' },
    servers: [{ url: SERVER_URL }],
    components: {
        schemas: {
            Error: ErrorSchema,
            OrsProfile,
            Suggestion,
            FeatureCollectionLineString,
            CreateRouteDto: {
                type: 'object',
                required: ['userId','startLat','startLng','endLat','endLng','geometry'],
                properties: {
                    userId:   { type: 'string' },
                    name:     { type: 'string', nullable: true },
                    startLat: { type: 'number' },
                    startLng: { type: 'number' },
                    endLat:   { type: 'number' },
                    endLng:   { type: 'number' },
                    distance: { type: 'integer', nullable: true },
                    duration: { type: 'integer', nullable: true },
                    geometry: { type: 'object', description: 'GeoJSON Geometry' }
                },
                example: {
                    userId: 'u1',
                    startLat: 47.56, startLng: 7.59,
                    endLat: 47.05,   endLng: 8.31,
                    geometry: { type: 'LineString', coordinates: [[7.59,47.56],[8.31,47.05]] }
                }
            },
            Route: {
                allOf: [
                    { $ref: '#/components/schemas/CreateRouteDto' },
                    {
                        type: 'object',
                        required: ['id','createdAt'],
                        properties: {
                            id: { type: 'string' },
                            createdAt: { type: 'string' }
                        }
                    }
                ]
            }
        }
    },
    paths: {
        /* ---------- ORS Proxy ---------- */
        '/ors/autocomplete': {
            get: {
                summary: 'Autocomplete (Proxy zu ORS Pelias, normalisiert)',
                parameters: [
                    { name: 'query', in: 'query', required: true, schema: { type: 'string' }, description: 'Suchtext' },
                    { name: 'size',  in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 } },
                    { name: 'lang',  in: 'query', schema: { type: 'string' }, description: 'z. B. de, en' },
                    { name: 'country', in: 'query', schema: { type: 'string' }, description: 'ISO-3 (z. B. CHE)' },
                    { name: 'lat',   in: 'query', schema: { type: 'number' }, description: 'focus.point.lat' },
                    { name: 'lon',   in: 'query', schema: { type: 'number' }, description: 'focus.point.lon' },
                    { name: 'layers',in: 'query', schema: { type: 'string' }, description: 'z. B. locality,region,address' }
                ],
                responses: {
                    '200': {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        features: { type: 'array', items: { $ref: '#/components/schemas/Suggestion' } }
                                    }
                                },
                                examples: {
                                    default: {
                                        value: {
                                            features: [
                                                { label: 'Zürich, CHE', coord: [8.5417, 47.3769] },
                                                { label: 'Bern, CHE',   coord: [7.4474, 46.9481] }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    },
                    '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '401': { description: 'Unauthorized (Upstream)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '429': { description: 'Rate limit',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            }
        },

        '/ors/geocode': {
            get: {
                summary: 'Geocode Search (Proxy zu ORS Pelias, normalisiert)',
                parameters: [
                    { name: 'query', in: 'query', required: true, schema: { type: 'string' } },
                    { name: 'size',  in: 'query', schema: { type: 'integer', minimum: 1, maximum: 20, default: 10 } },
                    { name: 'lang',  in: 'query', schema: { type: 'string' } },
                    { name: 'country', in: 'query', schema: { type: 'string' } },
                    { name: 'lat',   in: 'query', schema: { type: 'number' } },
                    { name: 'lon',   in: 'query', schema: { type: 'number' } },
                    { name: 'layers',in: 'query', schema: { type: 'string' } }
                ],
                responses: {
                    '200': {
                        description: 'OK',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        features: { type: 'array', items: { $ref: '#/components/schemas/Suggestion' } }
                                    }
                                }
                            }
                        }
                    },
                    '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '401': { description: 'Unauthorized (Upstream)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '429': { description: 'Rate limit',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            }
        },

        '/ors/directions': {
            post: {
                summary: 'Directions (Proxy zu ORS)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['start','end'],
                                properties: {
                                    start: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[lon,lat]' },
                                    end:   { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, description: '[lon,lat]' },
                                    profile: {
                                        $ref: '#/components/schemas/OrsProfile',
                                        default: 'driving-car',
                                        description: 'Routenart (Auto oder zu Fuß)'
                                    }
                                }
                            },
                            example: { start: [7.59,47.56], end: [8.31,47.05], profile: 'driving-car' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'GeoJSON FeatureCollection (LineString)',
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/FeatureCollectionLineString' } } }
                    },
                    '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '401': { description: 'Unauthorized (Upstream)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    '429': { description: 'Rate limit',  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            }
        },

        /* ---------- Routes CRUD ---------- */
        '/routes': {
            get: {
                summary: 'Alle Routen eines Nutzers',
                parameters: [{ name: 'userId', in: 'query', required: true, schema: { type: 'string' } }],
                responses: {
                    '200': { description: 'OK', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Route' } } } } },
                    '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            },
            post: {
                summary: 'Neue Route speichern',
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRouteDto' } } }
                },
                responses: {
                    '201': {
                        description: 'Created',
                        headers: { Location: { schema: { type: 'string' }, description: 'URI der neuen Ressource' } },
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Route' } } }
                    },
                    '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
                }
            }
        },
        '/routes/{id}': {
            get: {
                summary: 'Route lesen',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
                ],
                responses: {
                    '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Route' } } } },
                    '404': { description: 'Not Found' }
                }
            },
            delete: {
                summary: 'Route löschen',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'userId', in: 'query', required: true, schema: { type: 'string' } }
                ],
                responses: { '204': { description: 'Deleted' }, '404': { description: 'Not Found' } }
            }
        }
    }
};
