import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

// Verzeichnis aus DB_PATH ableiten und sicherstellen
const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// DB öffnen + sinnvolle Pragmas
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Tabelle anlegen (falls nicht vorhanden)
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
)`).run();

export default db;
