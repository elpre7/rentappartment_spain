import { detectCity } from "@/lib/cities";
import { parseListing, type CapturedPage } from "@/lib/parseListing";
import { listCampuses, listCities } from "@/lib/store";
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
  const cities = listCities();
  const initial = captured
    ? {
        ...parseListing(captured),
        city_id: detectCity([captured.address, captured.title, captured.text].filter(Boolean).join("\n"), cities.filter((c) => c.active)),
      }
    : null;
  return <AddClient cities={cities} campuses={listCampuses()} initial={initial} />;
}
