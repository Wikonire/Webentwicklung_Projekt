const path = require('path');
const fs = require('fs');
const os = require('os');

describe('routes.repo', () => {
    let repo;
    let dbPath;

    // Helper to build a minimal valid DTO
    const makeDto = (overrides = {}) => ({
        userId: 'u1',
        name: 'Home → Work',
        startLat: 47.56,
        startLng: 7.59,
        endLat: 47.05,
        endLng: 8.31,
        distance: 100000,
        duration: 3600,
        geometry: { type: 'LineString', coordinates: [[7.59, 47.56], [8.31, 47.05]] },
        ...overrides
    });

    beforeEach(() => {
        // fresh DB path for every test file run
        dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wayfinder-db-')), 'repo.db');
        process.env.DB_PATH = dbPath;

        jest.resetModules();
        repo = require('./routes.repo');
    });

    afterEach(() => {
        try { fs.unlinkSync(dbPath); } catch {}
    });

    test('insert returns the stored row with parsed geometry', () => {
        const dto = makeDto();
        const row = repo.insert(dto);

        expect(row).toBeDefined();
        expect(row.id).toBeDefined();
        expect(row.userId).toBe('u1');
        expect(row.geometry).toEqual(dto.geometry);
        expect(typeof row.createdAt).toBe('string');
    });

    test('listByUser returns only that user’s routes', () => {
        // u1 -> two routes, u2 -> one route
        repo.insert(makeDto({ name: 'r1' }));
        repo.insert(makeDto({ name: 'r2' }));
        repo.insert(makeDto({ userId: 'u2', name: 'other user' }));

        const u1List = repo.listByUser('u1');
        const u2List = repo.listByUser('u2');

        expect(Array.isArray(u1List)).toBe(true);
        expect(u1List.length).toBe(2);
        expect(u1List.every(r => r.userId === 'u1')).toBe(true);

        expect(u2List.length).toBe(1);
        expect(u2List[0].userId).toBe('u2');
    });

    test('getOne returns row only when id matches and userId is authorized', () => {
        const r1 = repo.insert(makeDto({ name: 'mine' }));
        const r2 = repo.insert(makeDto({ userId: 'u2', name: 'not mine' }));

        // same userId → found
        const mine = repo.getOne(r1.id, 'u1');
        expect(mine).toBeTruthy();
        expect(mine.name).toBe('mine');

        // wrong userId → null
        const notYours = repo.getOne(r2.id, 'u1');
        expect(notYours).toBeNull();

        // unknown id → null
        const unknown = repo.getOne('does-not-exist', 'u1');
        expect(unknown).toBeNull();
    });

    test('remove deletes when id+userId match; returns boolean', () => {
        const r1 = repo.insert(makeDto());
        const r2 = repo.insert(makeDto({ userId: 'u2' }));

        // correct user → true and actually gone
        const ok = repo.remove(r1.id, 'u1');
        expect(ok).toBe(true);
        expect(repo.getOne(r1.id, 'u1')).toBeNull();

        // wrong user → false and still there
        const notOk = repo.remove(r2.id, 'u1');
        expect(notOk).toBe(false);
        expect(repo.getOne(r2.id, 'u2')).toBeTruthy();
    });

    test('SQL injection in name does not break persistence', () => {
        const nasty = "x'); DROP TABLE routes; --";
        const r1 = repo.insert(makeDto({ name: nasty }));
        const r2 = repo.insert(makeDto({ name: 'legit' }));

        expect(r1).toBeDefined();
        expect(r2).toBeDefined();

        const list = repo.listByUser('u1');
        expect(list.length).toBeGreaterThanOrEqual(2);
        // ensure both rows still present
        const names = list.map(r => r.name).sort();
        expect(names).toEqual(expect.arrayContaining([nasty, 'legit']));
    });

    test('insert coalesced: fehlende Felder -> NULL in DB (name, distance, duration)', () => {
        const dto = makeDto();
        delete dto.name;
        delete dto.distance;
        delete dto.duration;

        const row = repo.insert(dto);
        expect(row.name).toBeNull();
        expect(row.distance).toBeNull();
        expect(row.duration).toBeNull();
    });

    test('insert coalesced: undefined wird zu NULL (name, distance, duration)', () => {
        const dto = makeDto({
            name: undefined,
            distance: undefined,
            duration: undefined,
        });

        const row = repo.insert(dto);
        expect(row.name).toBeNull();
        expect(row.distance).toBeNull();
        expect(row.duration).toBeNull();
    });

    test('insert coalesced: explizites null bleibt NULL', () => {
        const dto = makeDto({
            name: null,
            distance: null,
            duration: null,
        });

        const row = repo.insert(dto);
        expect(row.name).toBeNull();
        expect(row.distance).toBeNull();
        expect(row.duration).toBeNull();
    });

    test('insert coalesced: 0 bleibt 0, leerer String bleibt leer', () => {
        const dto = makeDto({
            name: '',
            distance: 0,
            duration: 0,
        });

        const row = repo.insert(dto);
        expect(row.name).toBe('');
        expect(row.distance).toBe(0);
        expect(row.duration).toBe(0);
    });
    describe('routes.repo INSERT: Spaltenliste & Argument-Reihenfolge', () => {
        const normalize = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();

        test('INSERT nutzt (id,userId,name,startLat,startLng,endLat,endLng,distance,duration,geometry) in genau der Reihenfolge', () => {
            jest.resetModules();

            // Mocks für DB
            const run = jest.fn();
            const get = jest.fn();
            const prepare = jest.fn((sql) => {
                // Einfach: alle non-SELECTs -> run, SELECTs -> get
                return /^\s*select\b/i.test(sql) ? { get } : { run };
            });

            // DB-Modul exakt so mocken, wie es in routes.repo importiert wird
            const dbModulePath = require.resolve('../db', { paths: [__dirname] });
            jest.doMock(dbModulePath, () => ({ prepare }));

            // UUID deterministisch machen
            const crypto = require('crypto');
            jest.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-123');

            const dto = {
                userId: 'u1',
                name: 'order-check',
                startLat: 11.1111,
                startLng: 22.2222,
                endLat: 33.3333,
                endLng: 44.4444,
                distance: 555,
                duration: 666,
                geometry: { type: 'LineString', coordinates: [[22.2222, 11.1111], [44.4444, 33.3333]] },
            };

            const rawRow = {
                id: 'uuid-123',
                userId: dto.userId,
                name: dto.name,
                startLat: dto.startLat,
                startLng: dto.startLng,
                endLat: dto.endLat,
                endLng: dto.endLng,
                distance: dto.distance,
                duration: dto.duration,
                geometry: JSON.stringify(dto.geometry),
                createdAt: '2025-01-01 00:00:00',
            };
            get.mockReturnValue(rawRow);

            jest.isolateModules(() => {
                const repo = require('./routes.repo');
                const row = repo.insert(dto);

                // 1) Das INSERT-SQL einsammeln und Spaltenreihenfolge prüfen
                const insertSql = prepare.mock.calls.map(([sql]) => sql).find((s) =>
                    /insert\s+into\s+routes/i.test(s)
                );
                expect(insertSql).toBeDefined();

                const collapsed = normalize(insertSql);
                expect(collapsed).toContain(
                    'insert into routes (id,userid,name,startlat,startlng,endlat,endlng,distance,duration,geometry) values (?,?,?,?,?,?,?,?,?,?)'
                );

                expect(run).toHaveBeenCalledTimes(1);
                expect(run).toHaveBeenCalledWith(
                    'uuid-123',
                    'u1',
                    'order-check',
                    11.1111,
                    22.2222,
                    33.3333,
                    44.4444,
                    555,
                    666,
                    JSON.stringify(dto.geometry)
                );

                expect(get).toHaveBeenCalledWith('uuid-123');

                expect(row.id).toBe('uuid-123');
                expect(row.userId).toBe('u1');
                expect(row.name).toBe('order-check');
                expect(row.geometry).toEqual(dto.geometry);
            });
        });

        test('INSERT coalesced: undefined ⇒ NULL für name/distance/duration (Argumente!)', () => {
            jest.resetModules();

            const run = jest.fn();
            const get = jest.fn();
            const prepare = jest.fn((sql) => (/^\s*select\b/i.test(sql) ? { get } : { run }));

            const dbModulePath = require.resolve('../db', { paths: [__dirname] });
            jest.doMock(dbModulePath, () => ({ prepare }));

            const crypto = require('crypto');
            jest.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-456');

            const dto = {
                userId: 'u1',
                // name/distance/duration explizit undefined -> sollen als NULL enden
                startLat: 1,
                startLng: 2,
                endLat: 3,
                endLng: 4,
                geometry: { type: 'LineString', coordinates: [[2, 1], [4, 3]] },
            };

            get.mockReturnValue({
                id: 'uuid-456',
                userId: dto.userId,
                name: null,
                startLat: 1,
                startLng: 2,
                endLat: 3,
                endLng: 4,
                distance: null,
                duration: null,
                geometry: JSON.stringify(dto.geometry),
                createdAt: '2025-01-01 00:00:00',
            });

            jest.isolateModules(() => {
                const repo = require('./routes.repo');
                const row = repo.insert(dto);

                // run wurde mit NULLs an den erwarteten Positionen aufgerufen
                expect(run).toHaveBeenCalledTimes(1);
                expect(run).toHaveBeenCalledWith(
                    'uuid-456',
                    'u1',
                    null, // name ?? null
                    1,
                    2,
                    3,
                    4,
                    null, // distance ?? null
                    null, // duration ?? null
                    JSON.stringify(dto.geometry)
                );

                expect(row.name).toBeNull();
                expect(row.distance).toBeNull();
                expect(row.duration).toBeNull();
            });
        });
    });
});
