const { validateCreateRoute } = require('./routes.validators');

const baseDto = () => ({
    userId: 'u1',
    startLat: 47.56,
    startLng: 7.59,
    endLat: 47.05,
    endLng: 8.31,
    geometry: { type: 'LineString', coordinates: [[7.59, 47.56], [8.31, 47.05]] },
});

describe('validateCreateRoute', () => {
    test('gibt null zurück bei gültigem Payload', () => {
        const err = validateCreateRoute(baseDto());
        expect(err).toBeNull();
    });

    test('akzeptiert Randwerte der Koordinaten', () => {
        const dto = baseDto();
        dto.startLat = -90; dto.endLat = 90;
        dto.startLng = -180; dto.endLng = 180;
        expect(validateCreateRoute(dto)).toBeNull();
    });

    test('akzeptiert 0 als gültigen Zahlenwert', () => {
        const dto = baseDto();
        dto.startLat = 0; dto.startLng = 0;
        expect(validateCreateRoute(dto)).toBeNull();
    });

    test('liefert "<feld> fehlt", wenn ein Pflichtfeld fehlt', () => {
        const required = ['userId','startLat','startLng','endLat','endLng','geometry'];
        for (const key of required) {
            const dto = baseDto();
            delete dto[key];
            const err = validateCreateRoute(dto);
            expect(err).toBe(`${key} fehlt`);
        }
    });

    test('prüft Koordinatenbereiche: Lat ∉ [-90,90] oder Lng ∉ [-180,180] → Fehler', () => {
        const cases = [
            { startLat: 90.0001 },
            { startLat: -90.0001 },
            { startLng: 180.0001 },
            { startLng: -180.0001 },
            { endLat: 91 },
            { endLat: -91 },
            { endLng: 181 },
            { endLng: -181 },
        ];
        for (const patch of cases) {
            const dto = { ...baseDto(), ...patch };
            expect(validateCreateRoute(dto)).toBe('Koordinaten ungültig');
        }
    });

    test('nicht-numerische Koordinaten (NaN/Strings) → Fehler', () => {
        const cases = [
            { startLat: NaN },
            { startLng: NaN },
            { endLat: NaN },
            { endLng: NaN },
            { startLat: '47.56' },
            { startLng: '7.59' },
            { endLat: '47.05' },
            { endLng: '8.31' },
            { startLat: Infinity },
            { endLng: -Infinity },
        ];
        for (const patch of cases) {
            const dto = { ...baseDto(), ...patch };
            expect(validateCreateRoute(dto)).toBe('Koordinaten ungültig');
        }
    });

    test('Priorität: Fehlt ein Pflichtfeld, kommt "… fehlt" (nicht Koordinatenfehler)', () => {
        const dto = baseDto();
        delete dto.geometry;
        // obwohl wir Koordinaten kaputt machen, soll zuerst "geometry fehlt" kommen
        dto.startLat = 12345;
        expect(validateCreateRoute(dto)).toBe('geometry fehlt');
    });
});
