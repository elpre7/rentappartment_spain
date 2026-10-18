import type { AppConfig } from "./config";
import { analyze, verdict, type Analysis, type Verdict } from "./finance";
import { campusDistances, type CampusDistance } from "./geo";
import type { Campus, Listing } from "./types";

export interface Evaluated {
  listing: Listing;
  analysis: Analysis;
  campuses: CampusDistance[];
  nearest: CampusDistance | null;
  verdict: Verdict;
}

export function evaluate(listing: Listing, cfg: AppConfig, campuses: Campus[]): Evaluated {
  const analysis = analyze(listing, cfg);
  const dists = listing.lat != null && listing.lng != null ? campusDistances(listing.lat, listing.lng, campuses) : [];
  const nearest = dists[0] ?? null;
  return {
    listing,
    analysis,
    campuses: dists,
    nearest,
    verdict: verdict(analysis, nearest?.walk_min ?? null, cfg),
  };
}
