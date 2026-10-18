"use client";

import { useEffect, useState } from "react";
import { CONFIG_SECTIONS, type AppConfig } from "@/lib/config";
import type { Campus, City } from "@/lib/types";

type CampusRow = Omit<Campus, "id" | "lat" | "lng"> & { lat: string; lng: string };
/** Ciudad en el formulario: números como texto; ITP en % (8, no 0,08). */
type CityRow = { [K in keyof City]: K extends "active" ? boolean : string } & { isNew?: boolean };

const parseNum = (s: string) => Number(String(s).replace(",", "."));

function toCityRow(c: City): CityRow {
  return {
    id: c.id,
    name: c.name,
    region: c.region,
    lat: String(c.lat),
    lng: String(c.lng),
    room_rent: String(c.room_rent),
    whole_rent_m2: String(c.whole_rent_m2),
    itp_pct: String(Math.round(c.itp_pct * 10000) / 100),
    rent_source: c.rent_source,
    active: c.active,
  };
}

export default function SettingsPage() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [cities, setCities] = useState<CityRow[]>([]);
  const [campuses, setCampuses] = useState<CampusRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  function loadDraft(c: AppConfig) {
    const d: Record<string, string | boolean> = {};
    for (const s of CONFIG_SECTIONS)
      for (const f of s.fields) {
        const v = c[f.key];
        d[f.key] = f.kind === "bool" ? Boolean(v) : f.kind === "pct" ? String(Math.round(Number(v) * 10000) / 100) : String(v);
      }
    setCfg(c);
    setDraft(d);
  }

  const loadCampuses = (list: Campus[]) => setCampuses(list.map((c) => ({ ...c, lat: String(c.lat), lng: String(c.lng) })));

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => loadDraft(d.config));
    fetch("/api/cities")
      .then((r) => r.json())
      .then((d) => setCities(d.cities.map(toCityRow)));
    fetch("/api/campuses")
      .then((r) => r.json())
      .then((d) => loadCampuses(d.campuses));
  }, []);

  async function save(reset = false) {
    const patch: Record<string, unknown> = {};
    for (const s of CONFIG_SECTIONS)
      for (const f of s.fields) {
        const v = draft[f.key];
        if (f.kind === "bool") patch[f.key] = Boolean(v);
        else {
          const n = parseNum(String(v));
          if (!Number.isFinite(n)) {
            setMsg(`Valor no válido en «${f.label}»`);
            return;
          }
          patch[f.key] = f.kind === "pct" ? n / 100 : n;
        }
      }
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reset ? { reset: true } : patch),
    });
    loadDraft((await res.json()).config);
    setMsg(reset ? "Valores por defecto restaurados." : "Guardado. Todos los pisos se recalculan con estos valores.");
  }

  async function saveCities() {
    const res = await fetch("/api/cities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cities: cities.map((c) => ({
          id: c.isNew ? "" : c.id,
          name: c.name,
          region: c.region,
          lat: parseNum(c.lat),
          lng: parseNum(c.lng),
          room_rent: parseNum(c.room_rent),
          whole_rent_m2: parseNum(c.whole_rent_m2),
          itp_pct: parseNum(c.itp_pct) / 100,
          rent_source: c.rent_source,
          active: c.active,
        })),
      }),
    });
    const body = await res.json();
    if (!res.ok) setMsg(body.error);
    else {
      setCities(body.cities.map(toCityRow));
      setMsg("Ciudades guardadas. Los pisos de cada ciudad se recalculan con sus valores.");
    }
  }

  async function saveCampuses() {
    const res = await fetch("/api/campuses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campuses: campuses.map((c) => ({ ...c, lat: parseNum(c.lat), lng: parseNum(c.lng) })) }),
    });
    const body = await res.json();
    if (!res.ok) setMsg(body.error);
    else {
      loadCampuses(body.campuses);
      setMsg("Campus guardados.");
    }
  }

  const setCity = (i: number, patch: Partial<CityRow>) => setCities((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const setCampus = (i: number, patch: Partial<CampusRow>) => setCampuses((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const savedCities = cities.filter((c) => !c.isNew);

  if (!cfg) return <p className="p-6 text-neutral-500">Cargando…</p>;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      {msg && <p className="card text-sm">{msg}</p>}

      <section className="card">
        <h2 className="mb-1 font-semibold">Ciudades</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Rentas de referencia (se usan si el piso no tiene las suyas) e ITP de cada ciudad. Los valores que vienen de serie son orientativos:
          compruébalos mirando anuncios de alquiler de la zona. Una ciudad desactivada no aparece en los selectores (sus pisos se conservan).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr>
                <th className="pb-1">Activa</th>
                <th>Ciudad</th>
                <th>Comunidad</th>
                <th>Habitación (€/mes)</th>
                <th>Piso entero (€/m²)</th>
                <th>ITP (%)</th>
                <th>Centro: latitud</th>
                <th>Longitud</th>
                <th>Fuente de las rentas</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c, i) => (
                <tr key={c.isNew ? `new-${i}` : c.id}>
                  <td className="pr-2">
                    <input type="checkbox" checked={c.active} onChange={(e) => setCity(i, { active: e.target.checked })} />
                  </td>
                  {(["name", "region", "room_rent", "whole_rent_m2", "itp_pct", "lat", "lng", "rent_source"] as const).map((k) => (
                    <td key={k} className="py-0.5 pr-1">
                      <input className="input" value={c[k]} onChange={(e) => setCity(i, { [k]: e.target.value })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="btn"
            onClick={() =>
              setCities((cs) => [
                ...cs,
                { id: "", name: "", region: "", lat: "", lng: "", room_rent: "", whole_rent_m2: "", itp_pct: "", rent_source: "", active: true, isNew: true },
              ])
            }
          >
            + Añadir ciudad
          </button>
          <button className="btn-primary" onClick={saveCities}>
            Guardar ciudades
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-1 font-semibold">Campus</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Las coordenadas que vienen de serie son aproximadas. Para corregirlas: busca el edificio en Google Maps, clic derecho sobre él y copia
          los dos números (latitud, longitud). Cada piso se mide solo contra los campus de su ciudad.
        </p>
        <div className="flex flex-col gap-2">
          {campuses.map((c, i) => (
            <div key={i} className="grid grid-cols-[auto_9rem_1fr_1fr_7rem_7rem_auto] items-center gap-2 text-sm">
              <input type="checkbox" title="Activo" checked={c.active} onChange={(e) => setCampus(i, { active: e.target.checked })} />
              <select className="input" value={c.city_id} onChange={(e) => setCampus(i, { city_id: e.target.value })}>
                {savedCities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              <input className="input" placeholder="Nombre" value={c.name} onChange={(e) => setCampus(i, { name: e.target.value })} />
              <input className="input" placeholder="Universidad" value={c.university} onChange={(e) => setCampus(i, { university: e.target.value })} />
              <input className="input" placeholder="Latitud" value={c.lat} onChange={(e) => setCampus(i, { lat: e.target.value })} />
              <input className="input" placeholder="Longitud" value={c.lng} onChange={(e) => setCampus(i, { lng: e.target.value })} />
              <button className="btn" onClick={() => setCampuses((cs) => cs.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            className="btn"
            onClick={() =>
              setCampuses((cs) => [...cs, { city_id: savedCities[0]?.id ?? "zaragoza", name: "", university: "", lat: "", lng: "", active: true }])
            }
          >
            + Añadir campus
          </button>
          <button className="btn-primary" onClick={saveCampuses}>
            Guardar campus
          </button>
        </div>
      </section>

      {CONFIG_SECTIONS.map((s) => (
        <section key={s.title} className="card">
          <h2 className="mb-3 font-semibold">{s.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {s.fields.map((f) => (
              <label key={f.key} className="flex flex-col gap-1 text-sm">
                {f.kind === "bool" ? (
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(draft[f.key])} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.checked })} />
                    {f.label}
                  </span>
                ) : (
                  <>
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {f.label}
                      {f.kind === "pct" && " (%)"}
                    </span>
                    <input className="input" inputMode="decimal" value={String(draft[f.key])} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                  </>
                )}
                {f.help && <span className="text-xs text-neutral-500">{f.help}</span>}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="flex gap-2 pb-8">
        <button className="btn-primary" onClick={() => save()}>
          Guardar ajustes
        </button>
        <button className="btn" onClick={() => confirm("¿Volver a los valores por defecto?") && save(true)}>
          Restaurar valores por defecto
        </button>
      </div>
    </div>
  );
}
