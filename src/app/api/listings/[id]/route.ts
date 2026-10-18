import { NextRequest, NextResponse } from "next/server";
import { evaluate } from "@/lib/evaluate";
import { deleteListing, getConfig, getListing, listCampuses, updateListing } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

async function idOf(ctx: Ctx): Promise<number> {
  return Number((await ctx.params).id);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const listing = getListing(await idOf(ctx));
  if (!listing) return NextResponse.json({ error: "No existe" }, { status: 404 });
  const cfg = getConfig();
  return NextResponse.json({ ...evaluate(listing, cfg, listCampuses()), config: cfg });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const listing = updateListing(await idOf(ctx), await req.json());
    if (!listing) return NextResponse.json({ error: "No existe" }, { status: 404 });
    const cfg = getConfig();
    return NextResponse.json({ ...evaluate(listing, cfg, listCampuses()), config: cfg });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  deleteListing(await idOf(ctx));
  return NextResponse.json({ ok: true });
}
