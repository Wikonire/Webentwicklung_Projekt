import { validateCreateRoute } from './routes.validators.js';

const baseDto = () => ({
    userId: 'u1',
    profile: 'driving-car',
    startLabel: 'Start',
    destinationLabel: 'Ziel',
    startCoord: [7.59, 47.56],
    destinationCoord: [8.31, 47.05],
});

describe('validateCreateRoute', () => {
    test('gibt null zurück bei gültigem Payload', () => {
        const dto = baseDto();
        expect(validateCreateRoute(dto)).toBeNull();
    });

    describe('checkMissingFields', () => {
        for (const field of ['userId', 'profile', 'startLabel', 'destinationLabel', 'startCoord', 'destinationCoord']) {
            test(`liefert Fehler wenn ${field} fehlt`, () => {
                const dto = baseDto();
                delete dto[field];
                expect(validateCreateRoute(dto)).toBe(`${field} fehlt`);
            });

            test(`liefert Fehler wenn ${field} null ist`, () => {
                const dto = baseDto();
                dto[field] = null;
                expect(validateCreateRoute(dto)).toBe(`${field} fehlt`);
            });
        }
    });

    describe('checkInvalidFields', () => {
        test('liefert Fehler wenn unerlaubtes Feld enthalten ist', () => {
            const dto = { ...baseDto(), foo: 'bar' };
            expect(validateCreateRoute(dto)).toBe('Ungültiges Feld: foo');
        });
    });

    describe('Koordinatenprüfung', () => {
        test('liefert Fehler wenn startCoord kein gültiges LngLat ist', () => {
            const dto = { ...baseDto(), startCoord: [1] };
            expect(validateCreateRoute(dto)).toBe('startCoord muss [lon,lat] (Zahlen) sein');
        });

        test('liefert Fehler wenn startCoord außerhalb des Bereichs ist', () => {
            const dto = { ...baseDto(), startCoord: [200, 47.56] };
            expect(validateCreateRoute(dto)).toBe('startCoord außerhalb des gültigen Bereichs');
        });

        test('liefert Fehler wenn destinationCoord kein gültiges LngLat ist', () => {
            const dto = { ...baseDto(), destinationCoord: 'invalid' };
            expect(validateCreateRoute(dto)).toBe('destinationCoord muss [lon,lat] (Zahlen) sein');
        });

        test('liefert Fehler wenn destinationCoord außerhalb des Bereichs ist', () => {
            const dto = { ...baseDto(), destinationCoord: [8.31, -200] };
            expect(validateCreateRoute(dto)).toBe('destinationCoord außerhalb des gültigen Bereichs');
        });
    });

    describe('Geometry-Validierung', () => {
        test('akzeptiert gültiges GeoJSON Objekt', () => {
            const dto = { ...baseDto(), geometry: { type: 'Point', coordinates: [7.59, 47.56] } };
            expect(validateCreateRoute(dto)).toBeNull();
        });

        test('akzeptiert gültigen GeoJSON String', () => {
            const dto = { ...baseDto(), geometry: JSON.stringify({ type: 'Point', coordinates: [7.59, 47.56] }) };
            expect(validateCreateRoute(dto)).toBeNull();
        });

        test('liefert Fehler bei ungültigem JSON String', () => {
            const dto = { ...baseDto(), geometry: '{ invalid json' };
            expect(validateCreateRoute(dto)).toBe('geometry ist kein gültiges JSON');
        });

        test('liefert Fehler wenn geometry falscher Typ ist', () => {
            const dto = { ...baseDto(), geometry: 12345 };
            expect(validateCreateRoute(dto)).toBe('geometry muss Objekt oder JSON-String sein');
        });
    });
});
