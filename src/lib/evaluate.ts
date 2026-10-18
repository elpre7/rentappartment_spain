import type { AppConfig } from "./config";
import { analyze, verdict, type Analysis, type Verdict } from "./finance";
import { campusDistances, type CampusDistance } from "./geo";
import type { Campus, City, Listing } from "./types";

export interface Evaluated {
  listing: Listing;
  city: City;
  analysis: Analysis;
  campuses: CampusDistance[];
  nearest: CampusDistance | null;
  verdict: Verdict;
}

/** Calcula un piso con los valores de su ciudad y solo contra los campus de esa ciudad. */
export function evaluate(listing: Listing, cfg: AppConfig, city: City, campuses: Campus[]): Evaluated {
  const analysis = analyze(listing, cfg, city);
  const own = campuses.filter((c) => c.city_id === city.id);
  const dists = listing.lat != null && listing.lng != null ? campusDistances(listing.lat, listing.lng, own) : [];
  const nearest = dists[0] ?? null;
  return {
    listing,
    city,
    analysis,
    campuses: dists,
    nearest,
    verdict: verdict(analysis, nearest?.walk_min ?? null, cfg),
  };
}
