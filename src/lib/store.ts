import { getDb } from "./db";
import { type AppConfig, DEFAULT_CONFIG, mergeConfig } from "./config";
import { STATUSES, type Campus, type Listing, type ListingInput } from "./types";

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
const TEXT_FIELDS = ["url", "external_id", "title", "address", "floor", "notes"] as const;
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
  if (!partial) {
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

export function listCampuses(): Campus[] {
  return (getDb().prepare("SELECT * FROM campuses ORDER BY id").all() as Row[]).map((r) => ({
    ...(r as unknown as Campus),
    active: Boolean(r.active),
  }));
}

/** Sustituye la lista entera de campus por la que manda el formulario. */
export function saveCampuses(campuses: Omit<Campus, "id">[]): Campus[] {
  for (const c of campuses) {
    if (!c.name?.trim()) throw new Error("Cada campus necesita un nombre");
    if (!Number.isFinite(Number(c.lat)) || !Number.isFinite(Number(c.lng))) throw new Error(`Coordenadas no válidas en ${c.name}`);
  }
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM campuses").run();
    const ins = db.prepare("INSERT INTO campuses (name, university, lat, lng, active) VALUES (?, ?, ?, ?, ?)");
    for (const c of campuses) ins.run(c.name.trim(), c.university ?? "", Number(c.lat), Number(c.lng), c.active ? 1 : 0);
  })();
  return listCampuses();
}
