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
    openapi: "3.0.3",
    info: {
        title: "Wayfinder API",
        version: "1.0.0",
        description: "API zum Suchen, Autovervollständigen und Speichern von Routen."
    },
    servers: [
        { url: "http://localhost:3000", description: "Lokale Entwicklung" }
    ],
    paths: {
        "/ors/autocomplete": {
            get: {
                summary: "Adressen autovervollständigen",
                parameters: [
                    { name: "query", in: "query", required: true, schema: { type: "string" }, description: "Suchtext" },
                    { name: "size", in: "query", schema: { type: "integer", minimum: 1, maximum: 30 } },
                    { name: "layers", in: "query", schema: { type: "string" } },
                    { name: "lang", in: "query", schema: { type: "string" } },
                    { name: "country", in: "query", schema: { type: "string" } }
                ],
                responses: {
                    200: {
                        description: "Liste mit Vorschlägen",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        suggestions: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    id: { type: "string" },
                                                    label: { type: "string" },
                                                    coord: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    400: { description: "Fehlende Parameter" }
                }
            }
        },
        "/ors/geocode": {
            get: {
                summary: "Geocoding (Adresse → Koordinaten)",
                parameters: [
                    { name: "query", in: "query", required: true, schema: { type: "string" } }
                ],
                responses: {
                    200: { description: "Liste mit Ergebnissen (wie Autocomplete)" },
                    400: { description: "Fehlende Parameter" }
                }
            }
        },
        "/ors/directions": {
            post: {
                summary: "Route berechnen",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    start: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                                    end: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                                    profile: { type: "string", enum: ["driving-car", "cycling-mountain", "foot-walking"] }
                                },
                                required: ["start", "end", "profile"]
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "GeoJSON FeatureCollection mit Route" },
                    400: { description: "Ungültiger Body" }
                }
            }
        },
        "/routes": {
            post: {
                summary: "Neue Route speichern",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    startCoord: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                                    destinationCoord: { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2 },
                                    startLabel: { type: "string" },
                                    destinationLabel: { type: "string" },
                                    profile: { type: "string" }
                                },
                                required: ["startCoord", "destinationCoord", "startLabel", "destinationLabel", "profile"]
                            }
                        }
                    }
                },
                responses: {
                    201: { description: "Route gespeichert und zurückgegeben" },
                    400: { description: "Validierungsfehler" },
                    500: { description: "Interner Fehler" }
                }
            },
            get: {
                summary: "Alle gespeicherten Routen eines Users abrufen",
                responses: {
                    200: {
                        description: "Liste mit gespeicherten Routen",
                        content: {
                            "application/json": {
                                schema: { type: "array", items: { type: "object" } }
                            }
                        }
                    }
                }
            }
        },
        "/routes/{id}": {
            get: {
                summary: "Eine gespeicherte Route abrufen",
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } }
                ],
                responses: {
                    200: { description: "Route gefunden" },
                    404: { description: "Nicht gefunden" }
                }
            },
            delete: {
                summary: "Eine gespeicherte Route löschen",
                parameters: [
                    { name: "id", in: "path", required: true, schema: { type: "string" } }
                ],
                responses: {
                    204: { description: "Route gelöscht" },
                    404: { description: "Nicht gefunden" }
                }
            }
        }
    }
};
