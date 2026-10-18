"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ListingForm from "@/components/ListingForm";
import type { AppConfig } from "@/lib/config";
import type { Evaluated } from "@/lib/evaluate";
import type { Scenario } from "@/lib/finance";
import { eur, num, pct } from "@/lib/format";
import { STATUSES, type Campus, type ListingInput } from "@/lib/types";

type Data = Evaluated & { config: AppConfig };

function Row({ label, a, b, strong }: { label: string; a: string; b: string; strong?: boolean }) {
  return (
    <tr className={`border-t border-neutral-200 dark:border-neutral-800 ${strong ? "font-semibold" : ""}`}>
      <td className="py-1.5 pr-4 text-neutral-600 dark:text-neutral-400">{label}</td>
      <td className="py-1.5 pr-4 text-right tabular-nums">{a}</td>
      <td className="py-1.5 text-right tabular-nums">{b}</td>
    </tr>
  );
}

function ScenarioTable({ rooms, whole, mortgage }: { rooms: Scenario; whole: Scenario; mortgage: boolean }) {
  const r = (f: (s: Scenario) => string, label: string, strong?: boolean) => (
    <Row label={label} a={f(rooms)} b={f(whole)} strong={strong} />
  );
  const opexLabels = Array.from(new Set([...rooms.opex, ...whole.opex].map((o) => o.label)));
  const opexOf = (s: Scenario, label: string) => s.opex.find((o) => o.label === label)?.amount ?? 0;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th />
          <th className="pb-2 text-right">{rooms.label}</th>
          <th className="pb-2 text-right">{whole.label}</th>
        </tr>
      </thead>
      <tbody>
        {r((s) => eur(s.monthly_rent) + (s.capped ? " *" : ""), "Renta mensual (lleno)")}
        {r((s) => eur(s.rent_per_room), "Renta por habitación")}
        {r((s) => num(s.vacancy_months, 1), "Meses vacíos al año")}
        {r((s) => eur(s.effective_income), "Ingresos del año", true)}
        {opexLabels.map((label) => (
          <Row key={label} label={`− ${label}`} a={eur(opexOf(rooms, label))} b={eur(opexOf(whole, label))} />
        ))}
        {r((s) => eur(s.noi), "Resultado neto (antes de hipoteca)", true)}
        {r((s) => eur(s.total_investment), "Inversión total (con gastos y muebles)")}
        {r((s) => pct(s.gross_yield), "Rentabilidad bruta")}
        {r((s) => pct(s.net_yield), "Rentabilidad neta", true)}
        {mortgage && r((s) => eur(s.cash_invested), "Dinero que pones tú")}
        {mortgage && r((s) => eur(s.annual_debt_service), "Cuotas de hipoteca al año")}
        {r((s) => `${eur(s.cash_flow)} (${eur(s.cash_flow / 12)}/mes)`, "Flujo de caja antes de impuestos", true)}
        {mortgage && r((s) => pct(s.coc), "Cash-on-cash")}
        {r((s) => eur(s.tax), "Impuesto estimado")}
        {r((s) => `${eur(s.cash_flow_after_tax)} (${eur(s.cash_flow_after_tax / 12)}/mes)`, "Flujo tras impuestos", true)}
        {r((s) => eur(s.breakeven_room_rent), "Renta por habitación para no perder dinero")}
      </tbody>
    </table>
  );
}

export default function ListingClient({ id }: { id: number }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    fetch(`/api/listings/${id}`).then(async (res) => {
      if (res.ok) setData(await res.json());
      else setError("Este piso no existe.");
    });
    fetch("/api/campuses")
      .then((r) => r.json())
      .then((d) => setCampuses(d.campuses));
  }, [id]);

  async function patch(input: ListingInput): Promise<string | null> {
    const res = await fetch(`/api/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (!res.ok) return body.error ?? "No se pudo guardar";
    setData(body);
    setFormKey((k) => k + 1);
    return null;
  }

  async function remove() {
    if (!confirm("¿Borrar este piso?")) return;
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (error) return <p className="p-6">{error} <Link className="underline" href="/">Volver</Link></p>;
  if (!data) return <p className="p-6 text-neutral-500">Cargando…</p>;

  const { listing: l, analysis: a, verdict: v, config: cfg } = data;
  const anyCapped = a.rooms.capped;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{l.title || `Piso ${l.id}`}</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            {l.address && <>{l.address} · </>}
            {eur(l.price)} · {l.size_m2} m² · {l.rooms} hab.
            {l.bathrooms != null && <> · {l.bathrooms} baños</>}
            {l.floor && <> · {l.floor}</>}
            {l.elevator != null && <> · {l.elevator ? "con ascensor" : "sin ascensor"}</>}
          </p>
          {l.url && (
            <a className="text-sm underline" href={l.url} target="_blank" rel="noreferrer">
              Ver anuncio original ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={l.status} onChange={(e) => patch({ status: e.target.value as ListingInput["status"] })}>
            {STATUSES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <button className="btn" onClick={remove}>
            Borrar
          </button>
        </div>
      </div>

      <div className={`card border-l-4 ${v.ok ? "border-l-green-700" : "border-l-red-700"}`}>
        <strong>{v.ok ? "✓ Pasa tu filtro" : "✗ No pasa tu filtro"}</strong>
        {!v.ok && <span className="text-sm text-neutral-600 dark:text-neutral-400"> — {v.reasons.join(", ")}</span>}
        <span className="ml-2 text-xs text-neutral-500">
          (neta ≥ {pct(cfg.net_yield_good)}
          {cfg.use_mortgage && <>, cash-on-cash ≥ {pct(cfg.coc_good)}</>}, ≤ {cfg.max_walk_minutes} min andando)
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Por habitaciones o entero, año completo</h2>
          <ScenarioTable rooms={a.rooms} whole={a.whole} mortgage={cfg.use_mortgage} />
          {anyCapped && (
            <p className="mt-3 text-xs text-amber-700">
              * La renta por habitaciones se ha recortado a la del piso entero por el tope del decreto. Puedes desactivarlo en Ajustes
              para ver el escenario sin tope.
            </p>
          )}
          <p className="mt-3 text-xs text-neutral-500">
            Impuesto: {pct(cfg.tax_rate, 0)} sobre (resultado − intereses − amortización), reducción {pct(cfg.rental_reduction, 0)}.
            Estimación orientativa, no asesoramiento fiscal.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card text-sm">
            <h2 className="mb-2 font-semibold">Compra</h2>
            <table className="w-full">
              <tbody>
                <Row label="Precio" a={eur(a.price)} b="" />
                <Row label={`ITP (${pct(cfg.itp_pct, 0)})`} a={eur(a.itp)} b="" />
                <Row label="Notaría, registro, gestoría, tasación" a={eur(a.purchase_costs - a.itp)} b="" />
                <Row label="Muebles" a={eur(a.rooms.furniture)} b="" />
                {l.reform_cost > 0 && <Row label="Reforma" a={eur(l.reform_cost)} b="" />}
                {cfg.use_mortgage && <Row label={`Hipoteca (${pct(cfg.ltv, 0)})`} a={eur(a.loan)} b="" />}
                {cfg.use_mortgage && <Row label="Cuota mensual" a={eur(a.monthly_payment)} b="" />}
              </tbody>
            </table>
          </div>
          <div className="card text-sm">
            <h2 className="mb-2 font-semibold">Campus</h2>
            {data.campuses.length === 0 ? (
              <p className="text-amber-700">Coloca el piso en el mapa (abajo) para ver las distancias.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {data.campuses.map((c) => (
                  <li key={c.campus.id} className="flex justify-between gap-2">
                    <span>{c.campus.name}</span>
                    <span className="tabular-nums text-neutral-600 dark:text-neutral-400">
                      {(c.distance_m / 1000).toFixed(1).replace(".", ",")} km · ~{c.walk_min} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-neutral-500">Minutos andando estimados (línea recta × 1,3 a 5 km/h).</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold">Editar datos y supuestos</h2>
        <ListingForm key={formKey} initial={l} campuses={campuses} submitLabel="Guardar cambios" showOverrides onSubmit={patch} />
      </div>
    </div>
  );
}
