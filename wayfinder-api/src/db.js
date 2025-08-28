const fs = require('fs'); const path = require('path');
const Database = require('better-sqlite3');
const { DB_PATH } = require('./config');

const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.prepare(`
CREATE TABLE IF NOT EXISTS routes (
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
)` ).run();

module.exports = db;
