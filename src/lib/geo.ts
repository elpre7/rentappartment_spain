import type { Campus } from "./types";

/** Distancia en línea recta, en metros. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Minutos andando estimados: la calle no va en línea recta (factor 1,3)
 * y se anda a ~5 km/h.
 */
export function walkMinutes(distanceM: number): number {
  return Math.round((distanceM * 1.3) / (5000 / 60));
}

export interface CampusDistance {
  campus: Campus;
  distance_m: number;
  walk_min: number;
}

export function campusDistances(lat: number, lng: number, campuses: Campus[]): CampusDistance[] {
  return campuses
    .filter((c) => c.active)
    .map((campus) => {
      const distance_m = haversineM(lat, lng, campus.lat, campus.lng);
      return { campus, distance_m, walk_min: walkMinutes(distance_m) };
    })
    .sort((a, b) => a.distance_m - b.distance_m);
}
