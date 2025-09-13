import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

// Verzeichnis aus DB_PATH entnehmen, wenn nicht vorhanden, dann neu erstellen
const DATA_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH); // öffnet oder erstellt DB.
db.pragma('journal_mode = WAL'); // Aktiviert Write-Ahead Logging siehe: https://sqlite.org/wal.html

// Fremdschlüssel-Constraints sind standardmässig bei SQLite aus
// wenn user-Tabelle erstellt werden würde, db.pragma('foreign_keys = ON') setzen.

// Tabelle anlegen (falls nicht vorhanden) userId aktuell immer u1
db.prepare(`
CREATE TABLE IF NOT EXISTS routes (
                                      id TEXT PRIMARY KEY,
                                      userId TEXT NOT NULL,
                                      startLabel TEXT NOT NULL,
                                      destinationLabel TEXT NOT NULL,
                                      startCoord TEXT NOT NULL,        -- JSON-String "[lon, lat]"
                                      destinationCoord TEXT NOT NULL,  -- JSON-String "[lon, lat]"
                                      profile TEXT NOT NULL,
                                      distance REAL,
                                      duration REAL,
                                      geometry TEXT,                    -- GeoJSON FeatureCollection
                                    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
)`).run();

export default db;
