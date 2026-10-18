import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { DEFAULT_CAMPUSES } from "./campuses";

let db: Database.Database | null = null;

/**
 * Un único fichero en la carpeta del usuario, para que los datos sobrevivan a
 * reinstalaciones. Se puede cambiar con la variable de entorno CAMPUSRENT_DB.
 */
function resolveDbPath(): string {
  if (process.env.CAMPUSRENT_DB) return process.env.CAMPUSRENT_DB;
  const dir = path.join(os.homedir(), ".campusrent");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "campusrent.db");
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL DEFAULT '',
  external_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL,
  size_m2 REAL NOT NULL,
  rooms INTEGER NOT NULL,
  bathrooms INTEGER,
  floor TEXT NOT NULL DEFAULT '',
  elevator INTEGER,
  community_monthly REAL,
  ibi_annual REAL,
  rentable_rooms INTEGER,
  room_rent REAL,
  whole_rent REAL,
  reform_cost REAL NOT NULL DEFAULT 0,
  lat REAL,
  lng REAL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_listings_external ON listings(external_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  university TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
`;

export function getDb(): Database.Database {
  if (db) return db;
  db = new Database(resolveDbPath());
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM campuses").get() as { n: number };
  if (n === 0) {
    const ins = db.prepare(
      "INSERT INTO campuses (name, university, lat, lng, active) VALUES (@name, @university, @lat, @lng, @active)",
    );
    for (const c of DEFAULT_CAMPUSES) ins.run({ ...c, active: c.active ? 1 : 0 });
  }
  return db;
}
