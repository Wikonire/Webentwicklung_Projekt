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

    // --- Insert/Select – je ein Expect pro Aussage ---
    const start = [8.55, 47.37]; // [lng, lat]
    const end = [8.56, 47.38];   // [lng, lat]
    const id = 'rid1';
    const lineString = {
        type: 'LineString',
        coordinates: [start, end]
    };

    beforeAll(() => {
        db.prepare(`
            INSERT INTO routes (
                id, userId, startLabel, destinationLabel,
                startCoord, endCoord, 
                distance, duration, geometry
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,          // id
            'u1',            // userId
            'Test Route Start 1',
            'Test Route End 1',
            start[1], // startLat (47.37)
            start[0], // startLng (8.55)
            end[1], // endLat   (47.38)
            end[0], // endLng   (8.56)
            1000, // distance in Meter
            300,  // duration in Sekunden
            JSON.stringify(lineString) //geometry
        );
    });

    afterAll(() => {
        try { db.close(); } catch {
            console.error('db-verbindung geschlossen fehlgeschlagen')
        }
        try {
            if (fs.existsSync(tempRootDir)) {
                // aufräumen (DB-Datei + Verzeichnisse)
                fs.rmSync(tempRootDir, { recursive: true, force: true });
            }
        } catch {
            console.error('aufgeräumt fehlgeschlagen')
        }
    });

    // --- Verzeichnis-Erstellung ---
    it('legt das Datenverzeichnis automatisch an', () => {
        expect(fs.existsSync(mockedDataDir)).toBe(true);
    });

    it('legt ein echtes Verzeichnis an (kein File)', () => {
        expect(fs.lstatSync(mockedDataDir).isDirectory()).toBe(true);
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
    it('hat Spalte destinationLabel', () => {
        expect(columnNames.has('destinationLabel')).toBe(true);
    });
    it('hat Spalte startLabel', () => {
        expect(columnNames.has('startLabel')).toBe(true);
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

    it('kann eine Zeile wieder auslesen', () => {
        const row = db.prepare('SELECT * FROM routes WHERE id = ?').get(id);
        expect(!!row).toBe(true);
    });

    it('liest das korrekte userId-Feld', () => {
        const row = db.prepare('SELECT userId FROM routes WHERE id = ?').get(id);
        expect(row.userId).toBe('u1');
    });

    it('liefert die Geometrie korrekt (JSON)', () => {
        const row = db.prepare('SELECT geometry FROM routes WHERE id = ?').get(id);
        expect(JSON.parse(row.geometry)).toEqual(lineString);
    });
});
