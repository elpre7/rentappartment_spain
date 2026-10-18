import { NextRequest, NextResponse } from "next/server";
import { listCampuses, saveCampuses } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ campuses: listCampuses() });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    return NextResponse.json({ campuses: saveCampuses(Array.isArray(body?.campuses) ? body.campuses : []) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
