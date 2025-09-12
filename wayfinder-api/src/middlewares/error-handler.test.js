import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import Database from 'better-sqlite3';

let db;
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

// jetzt wird das Repo mit der gemockten DB geladen
const { default: routesRepo } = await import('../repos/routes.repo.js');

beforeEach(() => {
    db.prepare('DELETE FROM routes').run(); // DB leeren
});

afterEach(() => {
    // keine Inserts zwischen Tests liegen lassen
});

describe('routesRepo (mit In-Memory DB)', () => {
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

    it('insert() should insert a route and return it with parsed geometry', () => {
        const row = routesRepo.insert(dto);
        expect(row.userId).toBe('u1');
        expect(row.name).toBe('Test Route');
        expect(row.geometry).toEqual(dto.geometry);
    });

    it('listByUser() should return all routes for a user', () => {
        const r1 = routesRepo.insert(dto);
        const r2 = routesRepo.insert({ ...dto, name: 'Second Route' });

        const list = routesRepo.listByUser('u1');
        expect(list.length).toBe(2);
        // robust: enthält beide, Reihenfolge egal
        expect(list.map(r => r.id)).toEqual(expect.arrayContaining([r1.id, r2.id]));
    });

    it('listByUser() should return [] if no routes for userId', () => {
        const list = routesRepo.listByUser('no-user');
        expect(list).toEqual([]);
    });

    it('getOne() should return route if id + userId match', () => {
        const r1 = routesRepo.insert(dto);
        const row = routesRepo.getOne(r1.id, 'u1');
        expect(row).not.toBeNull();
        expect(row.id).toBe(r1.id);
    });

    it('getOne() should return null if id not found', () => {
        const row = routesRepo.getOne('no-id', 'u1');
        expect(row).toBeNull();
    });

    it('getOne() should return null if userId does not match', () => {
        const r1 = routesRepo.insert(dto);
        const row = routesRepo.getOne(r1.id, 'other-user');
        expect(row).toBeNull();
    });

    it('remove() should remove route and return true', () => {
        const r1 = routesRepo.insert(dto);
        const result = routesRepo.remove(r1.id, 'u1');
        expect(result).toBe(true);
        expect(routesRepo.getOne(r1.id, 'u1')).toBeNull();
    });

    it('remove() should return false if route not found', () => {
        const result = routesRepo.remove('no-id', 'u1');
        expect(result).toBe(false);
    });
});
