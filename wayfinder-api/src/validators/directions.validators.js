import { isLngLat, isValidCoord } from './shared.validators.js';
import { allowedProfiles } from '../routes/ors.routes.js';

export function validateDirectionsDto(body) {
    // Pflichtfelder
    if (!body.start) return 'start fehlt';
    if (!body.end) return 'end fehlt';
    if (!body.profile) return 'profile fehlt';

    // Start
    if (!isLngLat(body.start)) return 'start muss [lon, lat] mit Zahlen sein';
    if (!isValidCoord(body.start)) return 'start-Koordinaten ungültig (-180..180, -90..90)';

    // End
    if (!isLngLat(body.end)) return 'end muss [lon, lat] mit Zahlen sein';
    if (!isValidCoord(body.end)) return 'end-Koordinaten ungültig (-180..180, -90..90)';

    // Profile
    if (!allowedProfiles.has(body.profile)) {
        return `${body.profile} ist kein gültiges Profil. Gültig sind: ${Array.from(allowedProfiles).join(', ')}`;
    }

    return null;
}
