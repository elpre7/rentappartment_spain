"use client";

import { useEffect, useState } from "react";
import { CONFIG_SECTIONS, type AppConfig } from "@/lib/config";
import type { Campus } from "@/lib/types";

type CampusRow = Omit<Campus, "id" | "lat" | "lng"> & { lat: string; lng: string };

export default function SettingsPage() {
  const [cfg, setCfg] = useState<AppConfig | null>(null);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => loadDraft(d.config));
    fetch("/api/campuses")
      .then((r) => r.json())
      .then((d) => setCampuses(d.campuses.map((c: Campus) => ({ ...c, lat: String(c.lat), lng: String(c.lng) }))));
  }, []);

  async function save(reset = false) {
    const patch: Record<string, unknown> = {};
    for (const s of CONFIG_SECTIONS)
      for (const f of s.fields) {
        const v = draft[f.key];
        if (f.kind === "bool") patch[f.key] = Boolean(v);
        else {
          const n = Number(String(v).replace(",", "."));
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

  async function saveCampuses() {
    const res = await fetch("/api/campuses", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campuses: campuses.map((c) => ({ ...c, lat: Number(c.lat.replace(",", ".")), lng: Number(c.lng.replace(",", ".")) })) }),
    });
    const body = await res.json();
    if (!res.ok) setMsg(body.error);
    else {
      setCampuses(body.campuses.map((c: Campus) => ({ ...c, lat: String(c.lat), lng: String(c.lng) })));
      setMsg("Campus guardados.");
    }
  }

  const setCampus = (i: number, patch: Partial<CampusRow>) => setCampuses((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  if (!cfg) return <p className="p-6 text-neutral-500">Cargando…</p>;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Ajustes</h1>
      {msg && <p className="card text-sm">{msg}</p>}

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

      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => save()}>
          Guardar ajustes
        </button>
        <button className="btn" onClick={() => confirm("¿Volver a los valores por defecto?") && save(true)}>
          Restaurar valores por defecto
        </button>
      </div>

      <section className="card">
        <h2 className="mb-1 font-semibold">Campus</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Las coordenadas que vienen de serie son aproximadas. Para corregirlas: busca el edificio en Google Maps, clic derecho sobre él y
          copia los dos números (latitud, longitud).
        </p>
        <div className="flex flex-col gap-2">
          {campuses.map((c, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_7rem_7rem_auto] items-center gap-2 text-sm">
              <input type="checkbox" title="Activo" checked={c.active} onChange={(e) => setCampus(i, { active: e.target.checked })} />
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
          <button className="btn" onClick={() => setCampuses((cs) => [...cs, { name: "", university: "", lat: "", lng: "", active: true }])}>
            + Añadir campus
          </button>
          <button className="btn-primary" onClick={saveCampuses}>
            Guardar campus
          </button>
        </div>
      </section>
    </div>
  );
}
