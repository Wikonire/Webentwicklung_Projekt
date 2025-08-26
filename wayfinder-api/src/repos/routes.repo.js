const crypto = require('crypto');
const db = require('../db');
const uuid = () => crypto.randomUUID();

const insert = (dto) => {
    const id = uuid();
    db.prepare(`
    INSERT INTO routes (id,userId,name,startLat,startLng,endLat,endLng,distance,duration,geometry)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
        id, dto.userId, dto.name ?? null,
        dto.startLat, dto.startLng, dto.endLat, dto.endLng,
        dto.distance ?? null, dto.duration ?? null,
        JSON.stringify(dto.geometry)
    );
    const row = db.prepare('SELECT * FROM routes WHERE id = ?').get(id);
    row.geometry = JSON.parse(row.geometry);
    return row;
};

const listByUser = (userId) => {
    const rows = db.prepare(
        'SELECT * FROM routes WHERE userId = ? ORDER BY createdAt DESC'
    ).all(userId);
    rows.forEach(r => r.geometry = JSON.parse(r.geometry));
    return rows;
};

const getOne = (id, userId) => {
    const row = db.prepare('SELECT * FROM routes WHERE id = ? AND userId = ?').get(id, userId);
    if (!row) return null;
    row.geometry = JSON.parse(row.geometry);
    return row;
};

const remove = (id, userId) => {
    const info = db.prepare('DELETE FROM routes WHERE id = ? AND userId = ?').run(id, userId);
    return info.changes > 0;
};

module.exports = { insert, listByUser, getOne, remove };
