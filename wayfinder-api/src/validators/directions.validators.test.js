import {describe, expect} from "@jest/globals";
import {validateDirectionsDto} from "./directions.validators.js";

describe('direction.validators', () => {

    describe('validateDirectionsDto', () => {
        test('gibt Fehler zurück wenn start kein gültiges LngLat ist', () => {
            const dto = {start: 'foo', end: [8.5, 47.3], profile: 'driving-car'};
            expect(validateDirectionsDto(dto)).toBe('start muss [lon, lat] mit Zahlen sein');
        });

        test('gibt Fehler zurück wenn end kein gültiges LngLat ist', () => {
            const dto = {start: [8.5, 47.3], end: 'bar', profile: 'driving-car'};
            expect(validateDirectionsDto(dto)).toBe('end muss [lon, lat] mit Zahlen sein');
        });

        test('gibt Fehler zurück wenn start außerhalb Koordinatenbereich ist', () => {
            const dto = {start: [200, 47.3], end: [8.5, 47.3], profile: 'driving-car'};
            expect(validateDirectionsDto(dto)).toBe('start-Koordinaten ungültig (-180..180, -90..90)');
        });

        test('gibt Fehler zurück wenn end außerhalb Koordinatenbereich ist', () => {
            const dto = {start: [8.5, 47.3], end: [181, 47.3], profile: 'driving-car'};
            expect(validateDirectionsDto(dto)).toBe('end-Koordinaten ungültig (-180..180, -90..90)');
        });

        test('gibt Fehler zurück wenn Profil ungültig ist', () => {
            const dto = {start: [8.5, 47.3], end: [8.6, 47.4], profile: 'spaceship'};
            const result = validateDirectionsDto(dto);
            expect(result).toMatch(/spaceship ist kein gültiges Profil/);
        });

        test('gibt null zurück wenn alles gültig ist', () => {
            const dto = {start: [8.5, 47.3], end: [8.6, 47.4], profile: 'driving-car'};
            expect(validateDirectionsDto(dto)).toBeNull();
        });
    });
});
