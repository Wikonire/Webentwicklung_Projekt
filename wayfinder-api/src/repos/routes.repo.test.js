import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import Database from 'better-sqlite3';

let db;

// db.js mocken, bevor Repo importiert wird
await jest.unstable_mockModule('../db.js', () => {
    db = new Database(':memory:');
    db.prepare(`
        CREATE TABLE routes (
                                id TEXT PRIMARY KEY,
                                userId TEXT NOT NULL,
                                name TEXT,
                                startLat REAL NOT NULL,
                                startLng REAL NOT NULL,
                                endLat REAL NOT NULL,
                                endLng REAL NOT NULL,
                                distance INTEGER,
                                duration INTEGER,
                                geometry TEXT NOT NULL,
                                createdAt TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `).run();
    return { default: db };
});

const { default: routesRepo } = await import('./routes.repo.js');

beforeEach(() => {
    // vor jedem Test DB leeren
    db.prepare('DELETE FROM routes').run();
});

afterEach(() => {
    // nach allen Tests aufräumen
});

describe('routes.repo (mit In-Memory DB)', () => {
    const dto = {
        userId: 'u1',
        name: 'Test Route',
        startLat: 47.37,
        startLng: 8.55,
        endLat: 47.38,
        endLng: 8.56,
        distance: 1000,
        duration: 300,
        geometry: { type: 'LineString', coordinates: [[8.55, 47.37], [8.56, 47.38]] },
    };

    it('insert() fügt Route ein und gibt sie zurück', () => {
        const row = routesRepo.insert(dto);
        expect(row.userId).toBe('u1');
        expect(row.geometry).toEqual(dto.geometry);
    });

    it('listByUser() liefert alle Routen für userId', () => {
        const r1 = routesRepo.insert(dto);
        const r2 = routesRepo.insert({ ...dto, name: 'Route 2' });

        const list = routesRepo.listByUser('u1');
        expect(list.length).toBe(2);
        expect(list.map(r => r.id)).toEqual(expect.arrayContaining([r1.id, r2.id]));
    });

    it('getOne() liefert Route bei id + userId', () => {
        const r1 = routesRepo.insert(dto);
        const row = routesRepo.getOne(r1.id, 'u1');
        expect(row.id).toBe(r1.id);
    });

    it('remove() löscht Route und gibt true zurück', () => {
        const r1 = routesRepo.insert(dto);
        const ok = routesRepo.remove(r1.id, 'u1');
        expect(ok).toBe(true);
        expect(routesRepo.getOne(r1.id, 'u1')).toBeNull();
    });
});
