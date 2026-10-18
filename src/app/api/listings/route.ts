import { NextRequest, NextResponse } from "next/server";
import { createListing, evaluateListing, findByExternalId, getConfig, listCampuses, listCities, listListings } from "@/lib/store";

export async function GET() {
  const cfg = getConfig();
  const campuses = listCampuses();
  return NextResponse.json({
    results: listListings()
      .map((l) => evaluateListing(l, cfg, campuses))
      .filter(Boolean),
    campuses,
    cities: listCities(),
    config: cfg,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = findByExternalId(String(body.external_id ?? ""));
    if (existing) {
      return NextResponse.json({ error: "Este anuncio ya está guardado", id: existing.id }, { status: 409 });
    }
    const listing = createListing(body);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
