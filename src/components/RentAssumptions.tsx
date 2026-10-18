"use client";

import { useState } from "react";
import type { AppConfig } from "@/lib/config";
import { rentableRooms, wholeRent } from "@/lib/finance";
import { eur, num } from "@/lib/format";
import type { Listing, ListingInput } from "@/lib/types";

interface Props {
  listing: Listing;
  config: AppConfig;
  capped: boolean;
  onPatch: (input: ListingInput) => Promise<string | null>;
  onToggleCap: (on: boolean) => Promise<void>;
}

const toStr = (v: number | null) => (v == null ? "" : String(v));
const toNum = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

/**
 * Los supuestos de alquiler, a la vista y editables: de ellos depende todo el cálculo.
 * Vacío = valor por defecto de Ajustes (con su fuente).
 */
export default function RentAssumptions({ listing: l, config: cfg, capped, onPatch, onToggleCap }: Props) {
  const [roomRent, setRoomRent] = useState(toStr(l.room_rent));
  const [whole, setWhole] = useState(toStr(l.whole_rent));
  const [rooms, setRooms] = useState(toStr(l.rentable_rooms));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = roomRent !== toStr(l.room_rent) || whole !== toStr(l.whole_rent) || rooms !== toStr(l.rentable_rooms);

  async function apply(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(await onPatch({ room_rent: toNum(roomRent), whole_rent: toNum(whole), rentable_rooms: toNum(rooms) }));
    setBusy(false);
  }

  async function toggle(on: boolean) {
    setBusy(true);
    await onToggleCap(on);
    setBusy(false);
  }

  const defaultWhole = Math.round(l.size_m2 * cfg.whole_rent_m2_default);

  return (
    <form onSubmit={apply} className="mb-4 flex flex-col gap-3 border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-900 dark:bg-orange-950/30">
      <strong>Supuestos de alquiler de este piso</strong>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">
        Mira anuncios de <em>alquiler</em> en la misma zona (habitaciones y pisos enteros) y pon aquí lo que se cobra. Vacío = valor por defecto.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span>Renta por habitación (€/mes)</span>
          <input className="input" inputMode="decimal" placeholder={String(cfg.room_rent_default)} value={roomRent} onChange={(e) => setRoomRent(e.target.value)} />
          <span className="text-xs text-neutral-500">
            {l.room_rent == null ? `Usando ${eur(cfg.room_rent_default)}: media de Zaragoza (HousingAnywhere, 2025), editable en Ajustes` : "Valor tuyo"}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span>Renta piso entero (€/mes)</span>
          <input className="input" inputMode="decimal" placeholder={String(defaultWhole)} value={whole} onChange={(e) => setWhole(e.target.value)} />
          <span className="text-xs text-neutral-500">
            {l.whole_rent == null
              ? `Usando ${eur(wholeRent(l, cfg))}: ${l.size_m2} m² × ${num(cfg.whole_rent_m2_default, 1)} €/m² (media de Zaragoza, idealista ago. 2026)`
              : "Valor tuyo"}
          </span>
        </label>
        <label className="flex flex-col gap-1">
          <span>Habitaciones que alquilas</span>
          <input className="input" inputMode="numeric" placeholder={String(l.rooms)} value={rooms} onChange={(e) => setRooms(e.target.value)} />
          <span className="text-xs text-neutral-500">
            {l.rentable_rooms == null ? `Usando ${rentableRooms(l)} (todas)` : "Valor tuyo"}
          </span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={busy || !dirty}>
          {busy ? "Calculando…" : "Recalcular"}
        </button>
        {error && <span className="text-red-700">{error}</span>}
      </div>
      <label className="flex items-start gap-2 border-t border-orange-200 pt-3 dark:border-orange-900">
        <input type="checkbox" className="mt-1" checked={cfg.cap_rooms_to_whole} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        <span>
          Aplicar el tope del decreto: lo que cobras por todas las habitaciones no puede superar la renta del piso entero.
          {cfg.cap_rooms_to_whole && capped && (
            <span className="block text-amber-700">
              Ahora mismo está recortando tus habitaciones a {eur(wholeRent(l, cfg))} al mes en total. Desmárcalo para ver el cálculo sin tope.
            </span>
          )}
          <span className="block text-xs text-neutral-500">Afecta a todos los pisos (es un ajuste general).</span>
        </span>
      </label>
    </form>
  );
}
