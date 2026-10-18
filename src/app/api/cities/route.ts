import { NextRequest, NextResponse } from "next/server";
import { listCities, saveCities } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ cities: listCities() });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ cities: saveCities(Array.isArray(body?.cities) ? body.cities : []) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
