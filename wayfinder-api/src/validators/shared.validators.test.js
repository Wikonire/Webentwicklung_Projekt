import {clampNumber, isLngLat, isValidCoord, normalizeLngLat, toNumber} from './shared.validators.js';

describe('shared.validators.js', () => {
    describe('isLngLat', () => {
        test('gibt true zurueck fuer ein gueltiges Lon/Lat Array', () => {
            expect(isLngLat([8.55, 47.37])).toBe(true);
        });

        test('gibt false zurueck wenn candidate kein Array ist', () => {
            expect(isLngLat('foo')).toBe(false);
        });

        test('gibt false zurueck wenn Array nicht genau zwei Elemente hat', () => {
            expect(isLngLat([8.55])).toBe(false);
        });

        test('gibt false zurueck wenn erstes Element keine Zahl ist', () => {
            expect(isLngLat(['foo', 47.37])).toBe(false);
        });

        test('gibt false zurueck wenn zweites Element keine Zahl ist', () => {
            expect(isLngLat([8.55, 'bar'])).toBe(false);
        });
    });

    describe('normalizeLngLat', () => {
        test('wandelt Strings in Zahlen um', () => {
            expect(normalizeLngLat(['8.55', '47.37'])).toEqual([8.55, 47.37]);
        });

        test('gibt NaN zurueck wenn Werte nicht konvertierbar sind', () => {
            const result = normalizeLngLat(['foo', 'bar']);
            expect(Number.isNaN(result[0])).toBe(true);
        });

        test('gibt NaN zurueck wenn Werte nicht konvertierbar sind (zweites Element)', () => {
            const result = normalizeLngLat(['foo', 'bar']);
            expect(Number.isNaN(result[1])).toBe(true);
        });

        test('gibt Zahlen unveraendert zurueck', () => {
            expect(normalizeLngLat([8.55, 47.37])).toEqual([8.55, 47.37]);
        });
    });

    describe('toNumber', () => {
        test('wandelt String in Zahl um', () => {
            expect(toNumber('42')).toBe(42);
        });

        test('gibt undefined zurueck wenn value undefined ist', () => {
            expect(toNumber(undefined)).toBeUndefined();
        });

        test('wandelt null in 0 um', () => {
            expect(toNumber(null)).toBe(0);
        });
    });

    describe('clampNumber', () => {
        test('klammert Wert auf Minimum', () => {
            expect(clampNumber(-5, 0, 10)).toBe(0);
        });

        test('klammert Wert auf Maximum', () => {
            expect(clampNumber(15, 0, 10)).toBe(10);
        });

        test('laesst Wert innerhalb der Grenzen unveraendert', () => {
            expect(clampNumber(5, 0, 10)).toBe(5);
        });
    });

    describe('isValidCoord', () => {
        test('gibt true fuer gueltige Koordinaten zurueck', () => {
            expect(isValidCoord([8.55, 47.37])).toBe(true);
        });

        test('gibt false zurueck wenn kein Array uebergeben wird', () => {
            expect(isValidCoord('foo')).toBe(false);
        });

        test('gibt false zurueck wenn Array nicht genau zwei Elemente hat', () => {
            expect(isValidCoord([8.55])).toBe(false);
        });

        test('gibt false zurueck wenn Longitude zu gross ist', () => {
            expect(isValidCoord([200, 47.37])).toBe(false);
        });

        test('gibt false zurueck wenn Longitude zu klein ist', () => {
            expect(isValidCoord([-200, 47.37])).toBe(false);
        });

        test('gibt false zurueck wenn Latitude zu gross ist', () => {
            expect(isValidCoord([8.55, 100])).toBe(false);
        });

        test('gibt false zurueck wenn Latitude zu klein ist', () => {
            expect(isValidCoord([8.55, -100])).toBe(false);
        });
    });
});
