import Database from "better-sqlite3";
import fs from "fs";
import os from "os";
import path from "path";
import { SEED_CITIES } from "./cities";

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

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  room_rent REAL NOT NULL,
  whole_rent_m2 REAL NOT NULL,
  itp_pct REAL NOT NULL,
  rent_source TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
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

function hasColumn(d: Database.Database, table: string, column: string): boolean {
  return (d.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);
}

/** Bases de datos de antes de las ciudades: todo lo existente era de Zaragoza. */
function migrate(d: Database.Database) {
  for (const table of ["listings", "campuses"]) {
    if (!hasColumn(d, table, "city_id")) {
      d.exec(`ALTER TABLE ${table} ADD COLUMN city_id TEXT NOT NULL DEFAULT 'zaragoza'`);
    }
  }
  d.exec("CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city_id)");
  // Antes los suministros por habitaciones los pagaba el propietario (180 €/mes por defecto);
  // ahora por defecto los pagan los inquilinos. Solo se cambia si seguía el valor antiguo.
  d.prepare("UPDATE settings SET value = '0' WHERE key = 'utilities_monthly_rooms' AND value = '180'").run();
  // El plazo por defecto pasó de 25 a 30 años; solo se cambia si seguía el valor antiguo.
  d.prepare("UPDATE settings SET value = '30' WHERE key = 'mortgage_years' AND value = '25'").run();
}

/**
 * Da de alta las ciudades que falten (nunca pisa las que ya existen, que el
 * usuario puede haber editado) y sus campus, solo si esa ciudad no tiene ninguno.
 * Si Zaragoza tenía rentas/ITP propios en Ajustes (versión anterior), se conservan.
 */
function seed(d: Database.Database) {
  const legacy: Record<string, number> = {};
  for (const r of d.prepare("SELECT key, value FROM settings WHERE key IN ('room_rent_default','whole_rent_m2_default','itp_pct')").all() as {
    key: string;
    value: string;
  }[]) {
    const n = Number(JSON.parse(r.value));
    if (Number.isFinite(n)) legacy[r.key] = n;
  }
  const insCity = d.prepare(
    `INSERT OR IGNORE INTO cities (id, name, region, lat, lng, room_rent, whole_rent_m2, itp_pct, rent_source, active)
     VALUES (@id, @name, @region, @lat, @lng, @room_rent, @whole_rent_m2, @itp_pct, @rent_source, @active)`,
  );
  const countCampuses = d.prepare("SELECT COUNT(*) AS n FROM campuses WHERE city_id = ?");
  const insCampus = d.prepare(
    "INSERT INTO campuses (city_id, name, university, lat, lng, active) VALUES (@city_id, @name, @university, @lat, @lng, @active)",
  );
  d.transaction(() => {
    for (const { campuses, ...city } of SEED_CITIES) {
      const row = { ...city, active: city.active ? 1 : 0 };
      if (city.id === "zaragoza") {
        row.room_rent = legacy.room_rent_default ?? row.room_rent;
        row.whole_rent_m2 = legacy.whole_rent_m2_default ?? row.whole_rent_m2;
        row.itp_pct = legacy.itp_pct ?? row.itp_pct;
      }
      const created = insCity.run(row).changes > 0;
      const { n } = countCampuses.get(city.id) as { n: number };
      if (created && n === 0) {
        for (const c of campuses) insCampus.run({ ...c, city_id: city.id, active: c.active ? 1 : 0 });
      }
    }
  })();
}

export function getDb(): Database.Database {
  if (db) return db;
  db = new Database(resolveDbPath());
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}
