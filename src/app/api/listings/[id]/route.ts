import { NextRequest, NextResponse } from "next/server";
import { deleteListing, evaluateListing, getConfig, getListing, updateListing } from "@/lib/store";
import type { Listing } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx): Promise<number> {
  return Number((await ctx.params).id);
}

function respond(listing: Listing | null) {
  if (!listing) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const evaluated = evaluateListing(listing);
  if (!evaluated) return NextResponse.json({ error: "La ciudad de este piso no existe" }, { status: 500 });
  return NextResponse.json({ ...evaluated, config: getConfig() });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  return respond(getListing(await idOf(ctx)));
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    return respond(updateListing(await idOf(ctx), await req.json()));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  deleteListing(await idOf(ctx));
  return NextResponse.json({ ok: true });
}
