import type { Campus, City } from "./types";

type SeedCity = City & { campuses: Omit<Campus, "id" | "city_id">[] };

/**
 * Ciudades que vienen configuradas. TODO es orientativo y editable en Ajustes:
 * - Coordenadas de campus APROXIMADAS (de memoria, sin verificar en un mapa).
 * - Rentas de Zaragoza y la habitación de León salen del informe de octubre de 2026;
 *   el resto son estimaciones propias, porque el informe no trae ese dato.
 * - ITP: tipo general de cada comunidad, de memoria. Compruébalo antes de comprar.
 */
export const SEED_CITIES: SeedCity[] = [
  {
    id: "zaragoza",
    name: "Zaragoza",
    region: "Aragón",
    lat: 41.6488,
    lng: -0.8891,
    room_rent: 375,
    whole_rent_m2: 12.3,
    itp_pct: 0.08,
    rent_source: "habitación: HousingAnywhere 2025; piso: idealista ago. 2026",
    active: true,
    campuses: [
      { name: "Campus San Francisco", university: "Universidad de Zaragoza", lat: 41.6422, lng: -0.9005, active: true },
      { name: "Facultad de Medicina y Ciencias de la Salud", university: "Universidad de Zaragoza", lat: 41.6368, lng: -0.9038, active: true },
      { name: "Campus Río Ebro (EINA)", university: "Universidad de Zaragoza", lat: 41.6833, lng: -0.8885, active: true },
      { name: "Facultad de Veterinaria", university: "Universidad de Zaragoza", lat: 41.6512, lng: -0.8662, active: true },
      { name: "Campus Paraíso (Economía y Empresa)", university: "Universidad de Zaragoza", lat: 41.6462, lng: -0.8842, active: true },
      { name: "Campus Villanueva de Gállego", university: "Universidad San Jorge", lat: 41.7642, lng: -0.8183, active: true },
    ],
  },
  {
    id: "huelva",
    name: "Huelva",
    region: "Andalucía",
    lat: 37.2614,
    lng: -6.9447,
    room_rent: 260,
    whole_rent_m2: 9,
    itp_pct: 0.07,
    rent_source: "estimación propia (sin dato publicado en el informe)",
    active: true,
    campuses: [
      { name: "Campus El Carmen", university: "Universidad de Huelva", lat: 37.2702, lng: -6.9232, active: true },
      { name: "Campus La Merced", university: "Universidad de Huelva", lat: 37.2598, lng: -6.9497, active: true },
    ],
  },
  {
    id: "jaen",
    name: "Jaén",
    region: "Andalucía",
    lat: 37.7796,
    lng: -3.7849,
    room_rent: 230,
    whole_rent_m2: 7.5,
    itp_pct: 0.07,
    rent_source: "habitación: idealista 2024 (210 €) + subida estimada; piso: estimación propia",
    active: true,
    campuses: [{ name: "Campus Las Lagunillas", university: "Universidad de Jaén", lat: 37.7882, lng: -3.7772, active: true }],
  },
  {
    id: "burgos",
    name: "Burgos",
    region: "Castilla y León",
    lat: 42.3439,
    lng: -3.6969,
    room_rent: 300,
    whole_rent_m2: 9.5,
    itp_pct: 0.08,
    rent_source: "estimación propia (sin dato publicado en el informe)",
    active: true,
    campuses: [
      { name: "Campus San Amaro / Hospital del Rey", university: "Universidad de Burgos", lat: 42.3515, lng: -3.6905, active: true },
      { name: "Campus Río Vena", university: "Universidad de Burgos", lat: 42.346, lng: -3.683, active: true },
    ],
  },
  {
    id: "leon",
    name: "León",
    region: "Castilla y León",
    lat: 42.5987,
    lng: -5.5671,
    room_rent: 300,
    whole_rent_m2: 8.5,
    itp_pct: 0.08,
    rent_source: "habitación: idealista jun. 2026; piso: estimación propia",
    active: true,
    campuses: [{ name: "Campus de Vegazana", university: "Universidad de León", lat: 42.614, lng: -5.56, active: true }],
  },
  {
    id: "huesca",
    name: "Huesca",
    region: "Aragón",
    lat: 42.1401,
    lng: -0.4089,
    room_rent: 300,
    whole_rent_m2: 9,
    itp_pct: 0.08,
    rent_source: "estimación propia (sin dato publicado en el informe)",
    active: true,
    campuses: [{ name: "Campus de Huesca", university: "Universidad de Zaragoza", lat: 42.143, lng: -0.412, active: true }],
  },
  {
    id: "castellon",
    name: "Castellón",
    region: "Comunidad Valenciana",
    lat: 39.9864,
    lng: -0.0513,
    room_rent: 300,
    whole_rent_m2: 10,
    itp_pct: 0.1,
    rent_source: "estimación propia (sin dato publicado en el informe)",
    active: true,
    campuses: [{ name: "Campus Riu Sec", university: "Universitat Jaume I", lat: 39.994, lng: -0.07, active: true }],
  },
];

/** Adivina la ciudad de un anuncio por su texto (dirección, título…). */
export function detectCity(text: string, cities: Pick<City, "id" | "name">[]): string | undefined {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  // "Castilla y León" es la comunidad, no la ciudad de León.
  const t = norm(text).replace(/castilla y leon/g, "");
  // Si salen varias, gana la que aparece antes (la dirección va antes que el resto del texto).
  let best: { id: string; at: number } | undefined;
  for (const c of cities) {
    const at = t.search(new RegExp(`\\b${norm(c.name)}\\b`));
    if (at >= 0 && (!best || at < best.at)) best = { id: c.id, at };
  }
  return best?.id;
}
