"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Campus, ListingInput } from "@/lib/types";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

type FieldDef = { key: keyof ListingInput; label: string; type: "text" | "number"; help?: string };

const BASIC: FieldDef[] = [
  { key: "url", label: "Enlace del anuncio", type: "text" },
  { key: "title", label: "Título", type: "text" },
  { key: "address", label: "Dirección o barrio", type: "text" },
  { key: "price", label: "Precio (€) *", type: "number" },
  { key: "size_m2", label: "Superficie (m²) *", type: "number" },
  { key: "rooms", label: "Habitaciones *", type: "number" },
  { key: "bathrooms", label: "Baños", type: "number" },
  { key: "floor", label: "Planta", type: "text" },
  { key: "community_monthly", label: "Comunidad (€/mes)", type: "number" },
  { key: "ibi_annual", label: "IBI (€/año)", type: "number", help: "Vacío = estimado con el % de Ajustes" },
];

const OVERRIDES: FieldDef[] = [
  { key: "rentable_rooms", label: "Habitaciones que alquilas", type: "number", help: "Vacío = todas" },
  { key: "room_rent", label: "Renta por habitación (€/mes)", type: "number", help: "Vacío = la de Ajustes" },
  { key: "whole_rent", label: "Renta piso entero (€/mes)", type: "number", help: "Vacío = €/m² de Ajustes × m²" },
  { key: "reform_cost", label: "Reforma (€)", type: "number" },
];

type FormState = Record<string, string>;

function toState(v: ListingInput): FormState {
  const s: FormState = {};
  for (const f of [...BASIC, ...OVERRIDES]) {
    const val = v[f.key];
    s[f.key] = val == null ? "" : String(val);
  }
  s.elevator = v.elevator == null ? "" : v.elevator ? "true" : "false";
  s.notes = v.notes ?? "";
  s.lat = v.lat == null ? "" : String(v.lat);
  s.lng = v.lng == null ? "" : String(v.lng);
  return s;
}

function fromState(s: FormState, external_id?: string): ListingInput {
  const out: Record<string, unknown> = {};
  for (const f of [...BASIC, ...OVERRIDES]) {
    const raw = s[f.key].trim();
    out[f.key] = f.type === "number" ? (raw === "" ? null : Number(raw.replace(",", "."))) : raw;
  }
  out.elevator = s.elevator === "" ? null : s.elevator === "true";
  out.notes = s.notes;
  out.lat = s.lat === "" ? null : Number(s.lat);
  out.lng = s.lng === "" ? null : Number(s.lng);
  if (external_id !== undefined) out.external_id = external_id;
  return out as ListingInput;
}

interface Props {
  initial: ListingInput;
  campuses: Campus[];
  submitLabel: string;
  showOverrides?: boolean;
  onSubmit: (data: ListingInput) => Promise<string | null>;
}

export default function ListingForm({ initial, campuses, submitLabel, showOverrides, onSubmit }: Props) {
  const [s, setS] = useState<FormState>(() => toState(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: string) => setS((prev) => ({ ...prev, [k]: v }));
  const picked = s.lat !== "" && s.lng !== "" ? { lat: Number(s.lat), lng: Number(s.lng) } : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSubmit(fromState(s, initial.external_id));
    setBusy(false);
    if (err) setError(err);
  }

  function field(f: FieldDef) {
    return (
      <label key={f.key} className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">{f.label}</span>
        <input
          className="input"
          inputMode={f.type === "number" ? "decimal" : undefined}
          value={s[f.key]}
          onChange={(e) => set(f.key, e.target.value)}
        />
        {f.help && <span className="text-xs text-neutral-500">{f.help}</span>}
      </label>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          {BASIC.map((f) => (f.type === "text" && f.key !== "floor" ? <div key={f.key} className="col-span-2">{field(f)}</div> : field(f)))}
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-600 dark:text-neutral-400">Ascensor</span>
            <select className="input" value={s.elevator} onChange={(e) => set("elevator", e.target.value)}>
              <option value="">No sé</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
        </div>
        {showOverrides && (
          <fieldset className="grid grid-cols-2 gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <legend className="mb-2 text-sm font-semibold">Supuestos de este piso</legend>
            {OVERRIDES.map(field)}
          </fieldset>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600 dark:text-neutral-400">Notas</span>
          <textarea className="input min-h-20" value={s.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm">
          <strong>Ubicación:</strong> haz clic en el mapa donde está el piso.{" "}
          {picked ? (
            <span className="text-green-700">Colocado ✓</span>
          ) : (
            <span className="text-amber-700">Sin colocar (no se podrá calcular la distancia al campus).</span>
          )}
        </p>
        <MapView
          campuses={campuses}
          picked={picked}
          onPick={(lat, lng) => setS((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }))}
          className="h-[420px] w-full"
        />
        <div className="mt-2 flex items-center gap-3">
          <button className="btn-primary" disabled={busy}>
            {busy ? "Guardando…" : submitLabel}
          </button>
          {error && <span className="text-sm text-red-700">{error}</span>}
        </div>
      </div>
    </form>
  );
}
