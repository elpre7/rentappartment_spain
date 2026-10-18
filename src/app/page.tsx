"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { MapPoint } from "@/components/MapView";
import type { AppConfig } from "@/lib/config";
import type { Evaluated } from "@/lib/evaluate";
import { eur } from "@/lib/format";
import { METRICS, metricColor, metricLabel, metricSortValue, type MetricKey } from "@/lib/metrics";
import { STATUSES, type Campus } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [results, setResults] = useState<Evaluated[] | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [metric, setMetric] = useState<MetricKey>("best_net");
  const [onlyOk, setOnlyOk] = useState(false);
  const [showDiscarded, setShowDiscarded] = useState(false);
  const [minRooms, setMinRooms] = useState(3);

  useEffect(() => {
    fetch("/api/listings")
      .then((r) => r.json())
      .then((d) => {
        setResults(d.results);
        setCampuses(d.campuses);
        setCfg(d.config);
      });
  }, []);

  const visible = useMemo(() => {
    if (!results) return [];
    return results
      .filter((e) => showDiscarded || e.listing.status !== "descartado")
      .filter((e) => e.listing.rooms >= minRooms)
      .filter((e) => !onlyOk || e.verdict.ok)
      .sort((a, b) => metricSortValue(b, metric) - metricSortValue(a, metric));
  }, [results, metric, onlyOk, showDiscarded, minRooms]);

  const points: MapPoint[] = cfg
    ? visible
        .filter((e) => e.listing.lat != null && e.listing.lng != null)
        .map((e) => ({
          id: e.listing.id,
          lat: e.listing.lat!,
          lng: e.listing.lng!,
          label: metricLabel(e, metric),
          color: metricColor(e, metric, cfg),
          title: `${e.listing.title || "Piso " + e.listing.id} — ${eur(e.listing.price)}`,
        }))
    : [];

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[420px_1fr]">
      <aside className="flex min-h-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col gap-2 border-b border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <span>Ordenar por</span>
            <select className="input w-auto flex-1" value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
              {METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1">
              Hab. mín.
              <select className="input w-auto" value={minRooms} onChange={(e) => setMinRooms(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={onlyOk} onChange={(e) => setOnlyOk(e.target.checked)} />✓ Pasan el filtro
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={showDiscarded} onChange={(e) => setShowDiscarded(e.target.checked)} />
              Descartados
            </label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {results === null && <p className="p-4 text-neutral-500">Cargando…</p>}
          {results?.length === 0 && (
            <div className="flex flex-col gap-3 p-4 text-sm">
              <p>Todavía no hay pisos.</p>
              <p>
                <Link className="btn-primary" href="/add">
                  + Añadir el primero
                </Link>
              </p>
              <p className="text-neutral-500">
                Consejo: instala el <Link className="underline" href="/marcador">marcador</Link> para añadir pisos de Idealista con un clic.
              </p>
            </div>
          )}
          {results && results.length > 0 && visible.length === 0 && <p className="p-4 text-sm text-neutral-500">Ningún piso cumple los filtros.</p>}
          {cfg &&
            visible.map((e) => {
              const status = STATUSES.find((s) => s.key === e.listing.status)?.label;
              return (
                <Link
                  key={e.listing.id}
                  href={`/listing/${e.listing.id}`}
                  className="flex items-start gap-3 border-b border-neutral-100 p-3 hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <span className="pin mt-0.5 min-w-16 text-center" style={{ background: metricColor(e, metric, cfg) }}>
                    {metricLabel(e, metric)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col text-sm">
                    <span className="truncate font-semibold">
                      {e.verdict.ok && <span className="text-green-700">✓ </span>}
                      {e.listing.title || `Piso ${e.listing.id}`}
                    </span>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {eur(e.listing.price)} · {e.listing.size_m2} m² · {e.listing.rooms} hab.
                      {e.nearest ? ` · ${e.nearest.walk_min} min a ${e.nearest.campus.name}` : " · sin ubicar"}
                    </span>
                    <span className="text-xs text-neutral-500">{status}</span>
                  </span>
                </Link>
              );
            })}
        </div>
      </aside>

      <div className="min-h-[400px]">
        <MapView campuses={campuses} points={points} onPointClick={(id) => router.push(`/listing/${id}`)} className="h-full min-h-[400px] w-full" />
      </div>
    </div>
  );
}
