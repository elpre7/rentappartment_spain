import { parseListing, type CapturedPage } from "@/lib/parseListing";
import { listCampuses } from "@/lib/store";
import AddClient from "./AddClient";

export const dynamic = "force-dynamic";

export default async function AddPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  let captured: CapturedPage | null = null;
  if (d) {
    try {
      captured = JSON.parse(d) as CapturedPage;
    } catch {
      captured = null;
    }
  }
  return <AddClient campuses={listCampuses()} initial={captured ? parseListing(captured) : null} />;
}
