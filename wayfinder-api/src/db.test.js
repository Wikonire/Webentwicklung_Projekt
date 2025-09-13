import fs from 'fs';
import path from 'path';
import os from 'os';
import { jest, describe, test, afterEach, expect } from '@jest/globals';
const tempRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wayfinder-db-'));
const mockedDataDir = path.join(tempRootDir, 'nested', 'dbdir');
const mockedDbPath = path.join(mockedDataDir, 'test.sqlite');

await jest.unstable_mockModule('./config.js', () => ({
    DB_PATH: mockedDbPath,
}));

const { default: db } = await import('./db.js');


const cleanups = [];
afterEach(() => {
    // Alle in diesem Test erzeugten Temp-Verzeichnisse und Spies aufräumen
    while (cleanups.length) {
        const fn = cleanups.pop();
        try { fn(); } catch {}
    }
});

describe('db.js – Initialisierung & Schema', () => {

    test('setzt PRAGMA journal_mode = WAL', async () => {
        const res = db.pragma('journal_mode');
        // je nach Plattform/Glibc kann Groß-/Kleinschreibung variieren, deshalb normalisieren
        expect(String(res[0].journal_mode).toLowerCase()).toBe('wal');
    });

    test('hat die erwarteten Spalten und erlaubt Insert/Select', async () => {

        const id = 'r1';
        db.prepare(`
      INSERT INTO routes (
        id, userId, startLabel, destinationLabel,
        startCoord, destinationCoord, profile,
        distance, duration, geometry
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            id, 'u1', 'Start', 'Ziel',
            JSON.stringify([7.59, 47.56]),
            JSON.stringify([8.31, 47.05]),
            'driving-car',
            1000, 300,
            JSON.stringify({ type: 'FeatureCollection', features: [] })
        );

        const row = db.prepare('SELECT * FROM routes WHERE id = ?').get(id);
        expect(row.userId).toBe('u1');
        expect(row.startLabel).toBe('Start');
        expect(row.destinationLabel).toBe('Ziel');
        expect(JSON.parse(row.startCoord)).toEqual([7.59, 47.56]);
        expect(row.createdAt).toBeTruthy();
    });
});
