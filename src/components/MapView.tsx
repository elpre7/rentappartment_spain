"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { Campus } from "@/lib/types";

export interface MapPoint {
  id: number;
  lat: number;
  lng: number;
  label: string;
  color: string;
  title?: string;
}

interface Props {
  campuses: Campus[];
  points?: MapPoint[];
  /** Si se pasa, un clic en el mapa coloca el piso ahí. */
  onPick?: (lat: number, lng: number) => void;
  onPointClick?: (id: number) => void;
  /** Punto destacado (el piso que se está editando). */
  picked?: { lat: number; lng: number } | null;
  className?: string;
}

const ZARAGOZA: [number, number] = [41.6488, -0.8891];

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export default function MapView({ campuses, points = [], onPick, onPointClick, picked, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  // Los callbacks cambian en cada render; el mapa se crea una vez y lee siempre el último.
  const onPickRef = useRef(onPick);
  const onPointClickRef = useRef(onPointClick);
  useEffect(() => {
    onPickRef.current = onPick;
    onPointClickRef.current = onPointClick;
  });

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current).setView(picked ? [picked.lat, picked.lng] : ZARAGOZA, picked ? 15 : 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      map.on("click", (e) => onPickRef.current?.(e.latlng.lat, e.latlng.lng));
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      draw();
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // El mapa se crea una sola vez; los datos se repintan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const L = LRef.current;
    const layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    for (const c of campuses.filter((c) => c.active)) {
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({ className: "map-label", html: `<div class="campus-pin">🎓 ${escapeHtml(c.name)}</div>`, iconAnchor: [10, 10] }),
        zIndexOffset: -100,
      })
        .bindTooltip(`${escapeHtml(c.university)} — ${escapeHtml(c.name)}`)
        .addTo(layer);
    }
    for (const p of points) {
      const m = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "map-label",
          html: `<div class="pin" style="background:${p.color}">${escapeHtml(p.label)}</div>`,
          iconAnchor: [20, 10],
        }),
      }).addTo(layer);
      if (p.title) m.bindTooltip(escapeHtml(p.title));
      m.on("click", () => onPointClickRef.current?.(p.id));
    }
    if (picked) {
      L.circleMarker([picked.lat, picked.lng], { radius: 9, color: "#c2410c", weight: 3, fillOpacity: 0.4 }).addTo(layer);
    }
  }

  useEffect(draw);

  return <div ref={el} className={className ?? "h-full min-h-[300px] w-full"} />;
}
