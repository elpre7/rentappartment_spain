import { NextRequest, NextResponse } from "next/server";
import { getConfig, resetConfig, saveConfig } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ config: getConfig() });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ config: body?.reset ? resetConfig() : saveConfig(body ?? {}) });
}
