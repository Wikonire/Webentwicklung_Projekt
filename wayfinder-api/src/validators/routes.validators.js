import { isLngLat, isValidCoord } from './shared.validators.js';

const REQUIRED_FIELDS = [
    'userId',
    'profile',
    'startLabel',
    'destinationLabel',
    'startCoord',
    'destinationCoord'
];

// erweiterbar je nach Bedarf
const ALLOWED_FIELDS = [
    ...REQUIRED_FIELDS,
    'id',
    'distance',
    'duration',
    'geometry'
];

function checkMissingFields(body) {
    for (const field of REQUIRED_FIELDS) {
        if (body[field] === undefined || body[field] === null) {
            return `${field} fehlt`;
        }
    }
    return null;
}

function checkInvalidFields(body) {
    for (const key of Object.keys(body)) {
        if (!ALLOWED_FIELDS.includes(key)) {
            return `Ungültiges Feld: ${key}`;
        }
    }
    return null;
}

function validateGeometry(geometry) {
    try {
        if (typeof geometry === 'string') {
            JSON.parse(geometry);
        } else if (typeof geometry === 'object') {
            // ok
        } else {
            return 'geometry muss Objekt oder JSON-String sein';
        }
        return null;
    } catch {
        return 'geometry ist kein gültiges JSON';
    }
}

export function validateCreateRoute(body) {
    // Pflichtfelder prüfen
    let error = checkMissingFields(body);
    if (error) return error;

    // Unerlaubte Felder abfangen
    error = checkInvalidFields(body);
    if (error) return error;

    // Start-Koordinaten prüfen
    if (!isLngLat(body.startCoord)) {
        return 'startCoord muss [lon,lat] (Zahlen) sein';
    }
    if (!isValidCoord(body.startCoord)) {
        return 'startCoord außerhalb des gültigen Bereichs';
    }

    // Ziel-Koordinaten prüfen
    if (!isLngLat(body.destinationCoord)) {
        return 'destinationCoord muss [lon,lat] (Zahlen) sein';
    }
    if (!isValidCoord(body.destinationCoord)) {
        return 'destinationCoord außerhalb des gültigen Bereichs';
    }

    // Optional: Geometrie prüfen
    if (body.geometry) {
        error = validateGeometry(body.geometry);
        if (error) return error;
    }

    return null;
}
