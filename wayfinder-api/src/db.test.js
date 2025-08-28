const fs = require('fs');
const path = require('path');
const os = require('os');

describe('db initialization (src/db.js)', () => {
    let dbPath;
    let db;

    beforeEach(() => {
        // Frisches, noch nicht existierendes Zielverzeichnis
        const base = fs.mkdtempSync(path.join(os.tmpdir(), 'wayfinder-db-'));
        const nestedDir = path.join(base, 'nested', 'dir');
        dbPath = path.join(nestedDir, 'wayfinder.test.db');

        // DB_PATH setzen, bevor Module geladen werden
        process.env.DB_PATH = dbPath;
        jest.resetModules();

        // db.js lädt config -> nimmt DB_PATH, erzeugt Verzeichnis/Datei und Schema
        db = require('../src/db'); // << anpassen, falls Pfad anders
    });

    afterEach(() => {
        try { db && db.close && db.close(); } catch {}
        // Testverzeichnis aufräumen
        try { fs.rmSync(path.dirname(path.dirname(dbPath)), { recursive: true, force: true }); } catch {}
    });

    test('legt Parent-Verzeichnis und DB-Datei an', () => {
        const dir = path.dirname(dbPath);
        expect(fs.existsSync(dir)).toBe(true);
        expect(fs.existsSync(dbPath)).toBe(true);
    });

    test('setzt PRAGMA journal_mode = WAL', () => {
        const mode = db.pragma('journal_mode', { simple: true });
        expect(String(mode).toLowerCase()).toBe('wal');
    });

    test('erstellt Tabelle "routes" mit erwarteten Spalten', () => {
        const t = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='routes'").get();
        expect(t).toBeDefined();

        const cols = db.prepare("PRAGMA table_info('routes')").all();
        const names = cols.map(c => c.name);

        expect(names).toEqual(
            expect.arrayContaining([
                'id','userId','name','startLat','startLng','endLat','endLng','distance','duration','geometry','createdAt'
            ])
        );

        const notnull = Object.fromEntries(cols.map(c => [c.name, c.notnull]));
        expect(notnull.userId).toBe(1);
        expect(notnull.startLat).toBe(1);
        expect(notnull.startLng).toBe(1);
        expect(notnull.endLat).toBe(1);
        expect(notnull.endLng).toBe(1);
        expect(notnull.geometry).toBe(1);
        expect(notnull.createdAt).toBe(1);
        // name/distance/duration sind nullable
        expect(notnull.name).toBe(0);
        expect(notnull.distance).toBe(0);
        expect(notnull.duration).toBe(0);
    });

    test('Minimaler Insert funktioniert, createdAt hat Default', () => {
        const id = 'test-1';
        const geom = { type: 'LineString', coordinates: [[7.59, 47.56], [8.31, 47.05]] };

        db.prepare(`
      INSERT INTO routes (id,userId,name,startLat,startLng,endLat,endLng,distance,duration,geometry)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
            id, 'u1', null,
            47.56, 7.59, 47.05, 8.31,
            null, null,
            JSON.stringify(geom)
        );

        const row = db.prepare('SELECT * FROM routes WHERE id = ?').get(id);
        expect(row).toBeDefined();
        expect(row.userId).toBe('u1');
        expect(typeof row.createdAt).toBe('string');
        expect(JSON.parse(row.geometry)).toEqual(geom);
    });
});
