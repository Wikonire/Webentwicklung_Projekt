import { jest, describe, it, beforeAll, afterAll, expect  } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';

// 1) Einen eigenen DB-Pfad in ein noch nicht existentes Unterverzeichnis mocken
const tempRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayfinder-db-'));
const mockedDataDir = path.join(tempRootDir, 'nested', 'dbdir');
const mockedDbPath = path.join(mockedDataDir, 'test.sqlite');

await jest.unstable_mockModule('./config.js', () => ({
    DB_PATH: mockedDbPath,
}));

const { default: db } = await import('./db.js');

describe('db.js – Initialisierung & Schema', () => {
    afterAll(() => {
        try { db.close(); } catch {}
        try {
            if (fs.existsSync(tempRootDir)) {
                // Grob aufräumen (DB-Datei + Verzeichnisbaum)
                fs.rmSync(tempRootDir, { recursive: true, force: true });
            }
        } catch {}
    });

    // --- Verzeichnis-Erstellung ---
    it('legt das Datenverzeichnis automatisch an', () => {
        expect(fs.existsSync(mockedDataDir)).toBe(true);
    });

    it('legt ein echtes Verzeichnis an (kein File)', () => {
        expect(fs.lstatSync(mockedDataDir).isDirectory()).toBe(true);
    });

    // --- Pragmas ---
    it('setzt PRAGMA foreign_keys = ON', () => {
        const row = db.prepare('PRAGMA foreign_keys').get();
        expect(row.foreign_keys).toBe(1);
    });

    it('setzt PRAGMA journal_mode = WAL', () => {
        const row = db.prepare('PRAGMA journal_mode').get();
        expect(String(row.journal_mode).toLowerCase()).toBe('wal');
    });

    // --- Tabellen-Schema: jeweils 1 Expect pro Spalte ---
    const tableInfo = db.prepare("PRAGMA table_info(routes)").all();
    const columnNames = new Set(tableInfo.map(c => c.name));

    it('hat Spalte id', () => {
        expect(columnNames.has('id')).toBe(true);
    });
    it('hat Spalte userId', () => {
        expect(columnNames.has('userId')).toBe(true);
    });
    it('hat Spalte name', () => {
        expect(columnNames.has('name')).toBe(true);
    });
    it('hat Spalte startLat', () => {
        expect(columnNames.has('startLat')).toBe(true);
    });
    it('hat Spalte startLng', () => {
        expect(columnNames.has('startLng')).toBe(true);
    });
    it('hat Spalte endLat', () => {
        expect(columnNames.has('endLat')).toBe(true);
    });
    it('hat Spalte endLng', () => {
        expect(columnNames.has('endLng')).toBe(true);
    });
    it('hat Spalte distance', () => {
        expect(columnNames.has('distance')).toBe(true);
    });
    it('hat Spalte duration', () => {
        expect(columnNames.has('duration')).toBe(true);
    });
    it('hat Spalte geometry', () => {
        expect(columnNames.has('geometry')).toBe(true);
    });
    it('hat Spalte createdAt', () => {
        expect(columnNames.has('createdAt')).toBe(true);
    });

    // --- Insert/Select – je ein Expect pro Aussage ---
    const lineString = { type: 'LineString', coordinates: [[8.55, 47.37], [8.56, 47.38]] };
    beforeAll(() => {
        db.prepare(`
      INSERT INTO routes (id, userId, name, startLat, startLng, endLat, endLng, distance, duration, geometry)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            'r1', 'u1', 'Test Route',
            47.37, 8.55, 47.38, 8.56,
            1000, 300,
            JSON.stringify(lineString)
        );
    });

    it('kann eine Zeile wieder auslesen', () => {
        const row = db.prepare('SELECT * FROM routes WHERE id = ?').get('r1');
        expect(!!row).toBe(true);
    });

    it('liest das korrekte userId-Feld', () => {
        const row = db.prepare('SELECT userId FROM routes WHERE id = ?').get('r1');
        expect(row.userId).toBe('u1');
    });

    it('liefert die Geometrie korrekt (JSON)', () => {
        const row = db.prepare('SELECT geometry FROM routes WHERE id = ?').get('r1');
        expect(JSON.parse(row.geometry)).toEqual(lineString);
    });
});
