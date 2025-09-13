import crypto from 'crypto';
import db from '../db.js'

const uuid = () => crypto.randomUUID();

const insert = (dto) => {
    const id = uuid();

    db.prepare(`
        INSERT INTO routes (
            id,
            userId,
            startLabel,
            destinationLabel,
            startCoord,
            destinationCoord,
            profile,
            distance,
            duration,
            geometry
        )
        VALUES (?, ?, ?, ?, json(?), json(?), ?, ?, ?, json(?))
    `).run(
        id,
        dto.userId,
        dto.startLabel,
        dto.destinationLabel,
        JSON.stringify(dto.startCoord),
        JSON.stringify(dto.destinationCoord),
        dto.profile,
        dto.distance ?? null,
        dto.duration ?? null,
        dto.geometry ? JSON.stringify(dto.geometry) : null
    );

    const row = db.prepare('SELECT * FROM routes WHERE id = ?').get(id);

    // JSON-Felder zurück in echte Arrays/Objekte
    row.startCoord = JSON.parse(row.startCoord);
    row.destinationCoord = JSON.parse(row.destinationCoord);
    row.geometry = row.geometry ? JSON.parse(row.geometry) : null;

    return row;
};

const listByUser = (userId) => {
    const rows = db.prepare('SELECT * FROM routes WHERE userId = ?').all(userId);
    return rows.map(r => ({
        ...r,
        startCoord: JSON.parse(r.startCoord),
        destinationCoord: JSON.parse(r.destinationCoord),
        geometry: r.geometry ? JSON.parse(r.geometry) : null
    }));
};

const getOne = (id, userId) => {
    const row = db.prepare('SELECT * FROM routes WHERE id = ? AND userId = ?').get(id, userId);
    if (!row) return null;
    row.startCoord = JSON.parse(row.startCoord);
    row.destinationCoord = JSON.parse(row.destinationCoord);
    row.geometry = JSON.parse(row.geometry);
    return row;
};

const remove = (id, userId) => {
    const info = db.prepare('DELETE FROM routes WHERE id = ? AND userId = ?').run(id, userId);
    return info.changes > 0;
};

export default { insert, listByUser, getOne, remove };
