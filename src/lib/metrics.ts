import type { AppConfig } from "./config";
import type { Evaluated } from "./evaluate";
import { pct } from "./format";

export const METRICS = [
  { key: "best_net", label: "Neta (mejor escenario)" },
  { key: "rooms_net", label: "Neta por habitaciones" },
  { key: "whole_net", label: "Neta piso entero" },
  { key: "best_coc", label: "Cash-on-cash" },
  { key: "cash_flow", label: "Flujo de caja/mes" },
  { key: "walk", label: "Minutos al campus" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];

function best(e: Evaluated) {
  return e.analysis.rooms.net_yield >= e.analysis.whole.net_yield ? e.analysis.rooms : e.analysis.whole;
}

/** Valor numérico de la métrica; "más alto = mejor" salvo en minutos. */
export function metricValue(e: Evaluated, key: MetricKey): number | null {
  switch (key) {
    case "best_net":
      return best(e).net_yield;
    case "rooms_net":
      return e.analysis.rooms.net_yield;
    case "whole_net":
      return e.analysis.whole.net_yield;
    case "best_coc":
      return best(e).coc;
    case "cash_flow":
      return best(e).cash_flow / 12;
    case "walk":
      return e.nearest?.walk_min ?? null;
  }
}

export function metricLabel(e: Evaluated, key: MetricKey): string {
  const v = metricValue(e, key);
  if (v == null) return "—";
  if (key === "walk") return `${v} min`;
  if (key === "cash_flow") return `${Math.round(v)} €`;
  return pct(v);
}

/** Verde = buena, ámbar = cerca, rojo = mala, según los umbrales de Ajustes. */
export function metricColor(e: Evaluated, key: MetricKey, cfg: AppConfig): string {
  const v = metricValue(e, key);
  if (v == null) return "#737373";
  const [good, near, higherIsBetter] =
    key === "walk"
      ? [cfg.max_walk_minutes, cfg.max_walk_minutes * 1.5, false]
      : key === "best_coc"
        ? [cfg.coc_good, cfg.coc_good * 0.5, true]
        : key === "cash_flow"
          ? [100, 0, true]
          : [cfg.net_yield_good, cfg.net_yield_good * 0.8, true];
  const ok = higherIsBetter ? v >= good : v <= good;
  const close = higherIsBetter ? v >= near : v <= near;
  return ok ? "#15803d" : close ? "#b45309" : "#b91c1c";
}

/** Para ordenar: lo mejor primero. */
export function metricSortValue(e: Evaluated, key: MetricKey): number {
  const v = metricValue(e, key);
  if (v == null) return -Infinity;
  return key === "walk" ? -v : v;
}
