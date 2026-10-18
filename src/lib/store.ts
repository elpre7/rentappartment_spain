import { getDb } from "./db";
import { type AppConfig, DEFAULT_CONFIG, mergeConfig } from "./config";
import { evaluate, type Evaluated } from "./evaluate";
import { STATUSES, type Campus, type City, type Listing, type ListingInput } from "./types";

type Row = Record<string, unknown>;

function toListing(r: Row): Listing {
  return {
    ...(r as unknown as Listing),
    elevator: r.elevator == null ? null : Boolean(r.elevator),
  };
}

const NUMBER_FIELDS = [
  "price",
  "size_m2",
  "rooms",
  "bathrooms",
  "community_monthly",
  "ibi_annual",
  "rentable_rooms",
  "room_rent",
  "whole_rent",
  "reform_cost",
  "lat",
  "lng",
] as const;
const TEXT_FIELDS = ["city_id", "url", "external_id", "title", "address", "floor", "notes"] as const;
const REQUIRED = ["price", "size_m2", "rooms"] as const;

/** Valida y normaliza lo que llega del navegador. Lanza Error con un mensaje en español. */
export function sanitizeInput(input: Record<string, unknown>, partial: boolean): Row {
  const out: Row = {};
  for (const k of NUMBER_FIELDS) {
    if (!(k in input)) continue;
    const v = input[k];
    if (v === null || v === "") {
      if ((REQUIRED as readonly string[]).includes(k)) throw new Error(`Falta ${k}`);
      out[k] = k === "reform_cost" ? 0 : null;
      continue;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || (k !== "lat" && k !== "lng" && n < 0)) throw new Error(`Valor no válido en ${k}`);
    out[k] = n;
  }
  for (const k of TEXT_FIELDS) {
    if (k in input) out[k] = String(input[k] ?? "").slice(0, 5000);
  }
  if ("elevator" in input) {
    const v = input.elevator;
    out.elevator = v === null || v === "" ? null : v === true || v === "true" || v === 1 ? 1 : 0;
  }
  if ("status" in input) {
    const s = String(input.status);
    if (!STATUSES.some((x) => x.key === s)) throw new Error("Estado no válido");
    out.status = s;
  }
  if ("city_id" in out && !getCity(String(out.city_id))) throw new Error("Ciudad desconocida");
  if (!partial) {
    if (!out.city_id) throw new Error("Falta la ciudad");
    for (const k of REQUIRED) {
      if (out[k] == null) throw new Error(`Falta ${k === "size_m2" ? "superficie" : k === "rooms" ? "habitaciones" : "precio"}`);
    }
  }
  return out;
}

export function listListings(): Listing[] {
  return (getDb().prepare("SELECT * FROM listings ORDER BY created_at DESC, id DESC").all() as Row[]).map(toListing);
}

export function getListing(id: number): Listing | null {
  const r = getDb().prepare("SELECT * FROM listings WHERE id = ?").get(id) as Row | undefined;
  return r ? toListing(r) : null;
}

export function findByExternalId(externalId: string): Listing | null {
  if (!externalId) return null;
  const r = getDb().prepare("SELECT * FROM listings WHERE external_id = ?").get(externalId) as Row | undefined;
  return r ? toListing(r) : null;
}

export function createListing(input: ListingInput): Listing {
  const data = sanitizeInput(input as Record<string, unknown>, false);
  const keys = Object.keys(data);
  const info = getDb()
    .prepare(`INSERT INTO listings (${keys.join(", ")}) VALUES (${keys.map((k) => "@" + k).join(", ")})`)
    .run(data);
  return getListing(Number(info.lastInsertRowid))!;
}

export function updateListing(id: number, input: ListingInput): Listing | null {
  const data = sanitizeInput(input as Record<string, unknown>, true);
  const keys = Object.keys(data);
  if (keys.length > 0) {
    getDb()
      .prepare(`UPDATE listings SET ${keys.map((k) => `${k} = @${k}`).join(", ")}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...data, id });
  }
  return getListing(id);
}

export function deleteListing(id: number): void {
  getDb().prepare("DELETE FROM listings WHERE id = ?").run(id);
}

export function getConfig(): AppConfig {
  const rows = getDb().prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  const stored: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      stored[r.key] = JSON.parse(r.value);
    } catch {
      /* valor corrupto: se usa el default */
    }
  }
  return mergeConfig(stored);
}

export function saveConfig(patch: Record<string, unknown>): AppConfig {
  const valid = mergeConfig({ ...getConfig(), ...patch });
  const db = getDb();
  const up = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  db.transaction(() => {
    for (const key of Object.keys(DEFAULT_CONFIG) as (keyof AppConfig)[]) up.run(key, JSON.stringify(valid[key]));
  })();
  return valid;
}

export function resetConfig(): AppConfig {
  getDb().prepare("DELETE FROM settings").run();
  return getConfig();
}

function toCity(r: Row): City {
  return { ...(r as unknown as City), active: Boolean(r.active) };
}

export function listCities(): City[] {
  return (getDb().prepare("SELECT * FROM cities ORDER BY name").all() as Row[]).map(toCity);
}

export function getCity(id: string): City | null {
  const r = getDb().prepare("SELECT * FROM cities WHERE id = ?").get(id) as Row | undefined;
  return r ? toCity(r) : null;
}

/** "Castellón de la Plana" → "castellon-de-la-plana" */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Crea o actualiza ciudades (no se borran: se desactivan). */
export function saveCities(cities: Partial<City>[]): City[] {
  const rows = cities.map((c) => {
    const name = String(c.name ?? "").trim();
    if (!name) throw new Error("Cada ciudad necesita un nombre");
    const nums = { lat: Number(c.lat), lng: Number(c.lng), room_rent: Number(c.room_rent), whole_rent_m2: Number(c.whole_rent_m2), itp_pct: Number(c.itp_pct) };
    for (const [k, v] of Object.entries(nums)) if (!Number.isFinite(v)) throw new Error(`Valor no válido en ${name} (${k})`);
    return {
      id: c.id || slugify(name),
      name,
      region: String(c.region ?? ""),
      ...nums,
      rent_source: String(c.rent_source ?? ""),
      active: c.active === false ? 0 : 1,
    };
  });
  const db = getDb();
  const up = db.prepare(`INSERT INTO cities (id, name, region, lat, lng, room_rent, whole_rent_m2, itp_pct, rent_source, active)
    VALUES (@id, @name, @region, @lat, @lng, @room_rent, @whole_rent_m2, @itp_pct, @rent_source, @active)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, region = excluded.region, lat = excluded.lat, lng = excluded.lng,
      room_rent = excluded.room_rent, whole_rent_m2 = excluded.whole_rent_m2, itp_pct = excluded.itp_pct,
      rent_source = excluded.rent_source, active = excluded.active`);
  db.transaction(() => rows.forEach((r) => up.run(r)))();
  return listCities();
}

export function listCampuses(): Campus[] {
  return (getDb().prepare("SELECT * FROM campuses ORDER BY city_id, id").all() as Row[]).map((r) => ({
    ...(r as unknown as Campus),
    active: Boolean(r.active),
  }));
}

/** Sustituye la lista entera de campus por la que manda el formulario. */
export function saveCampuses(campuses: Omit<Campus, "id">[]): Campus[] {
  for (const c of campuses) {
    if (!c.name?.trim()) throw new Error("Cada campus necesita un nombre");
    if (!getCity(c.city_id)) throw new Error(`Ciudad desconocida en ${c.name}`);
    if (!Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lng))) throw new Error(`Coordenadas no válidas en ${c.name}`);
  }
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM campuses").run();
    const ins = db.prepare("INSERT INTO campuses (city_id, name, university, lat, lng, active) VALUES (?, ?, ?, ?, ?, ?)");
    for (const c of campuses) ins.run(c.city_id, c.name.trim(), c.university ?? "", Number(c.lat), Number(c.lng), c.active ? 1 : 0);
  })();
  return listCampuses();
}

/** Un piso evaluado con su ciudad, o null si no existe. */
export function evaluateListing(l: Listing, cfg: AppConfig = getConfig(), campuses: Campus[] = listCampuses()): Evaluated | null {
  const city = getCity(l.city_id);
  return city ? evaluate(l, cfg, city, campuses) : null;
}
