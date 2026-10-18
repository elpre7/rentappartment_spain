import type { AppConfig } from "./config";
import type { City, Listing } from "./types";

/** Lo que depende de la ciudad: rentas de referencia e ITP. */
export type Market = Pick<City, "room_rent" | "whole_rent_m2" | "itp_pct">;

export type ScenarioKey = "rooms" | "whole";

export interface Scenario {
  key: ScenarioKey;
  label: string;
  /** Renta mensual con el piso lleno. */
  monthly_rent: number;
  /** Renta por habitación aplicada (en "whole", la parte proporcional). */
  rent_per_room: number;
  /** true si el tope del decreto ha recortado la renta por habitaciones. */
  capped: boolean;
  vacancy_months: number;
  /** Ingresos del año descontando los meses vacíos. */
  effective_income: number;
  opex: { label: string; amount: number }[];
  opex_total: number;
  /** Resultado neto de explotación (antes de hipoteca e impuestos). */
  noi: number;
  furniture: number;
  total_investment: number;
  gross_yield: number;
  net_yield: number;
  cash_invested: number;
  annual_debt_service: number;
  cash_flow: number;
  coc: number;
  /** Lo que te queda tras impuestos sobre el dinero que pones tú. */
  coc_after_tax: number;
  tax: number;
  cash_flow_after_tax: number;
  /** Renta por habitación para que el flujo de caja (antes de impuestos) sea 0. */
  breakeven_room_rent: number;
}

export interface Analysis {
  price: number;
  itp: number;
  purchase_costs: number;
  loan: number;
  monthly_payment: number;
  rooms: Scenario;
  whole: Scenario;
}

/** Cuota mensual de un préstamo francés. */
export function monthlyPayment(principal: number, annualRate: number, years: number): number {
  if (principal <= 0) return 0;
  const n = years * 12;
  const r = annualRate / 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function rentableRooms(l: Pick<Listing, "rooms" | "rentable_rooms">): number {
  return Math.max(0, l.rentable_rooms ?? l.rooms);
}

export function wholeRent(l: Pick<Listing, "whole_rent" | "size_m2">, market: Market): number {
  return l.whole_rent ?? Math.round(l.size_m2 * market.whole_rent_m2);
}

export function analyze(l: Listing, cfg: AppConfig, market: Market): Analysis {
  const price = l.price;
  const nRooms = rentableRooms(l);
  const whole = wholeRent(l, market);
  const roomRent = l.room_rent ?? market.room_rent;

  const itp = price * market.itp_pct;
  const purchase_costs =
    itp + cfg.notary_registry + cfg.gestoria + (cfg.use_mortgage ? cfg.appraisal : 0);
  const loan = cfg.use_mortgage ? price * cfg.ltv : 0;
  const payment = monthlyPayment(loan, cfg.mortgage_rate, cfg.mortgage_years);
  const annualDebt = payment * 12;
  // Intereses del primer año: aproximación suficiente para estimar el impuesto.
  const interestY1 = loan * cfg.mortgage_rate;
  const ibi = l.ibi_annual ?? price * cfg.ibi_pct_of_price;
  const community = (l.community_monthly ?? 0) * 12;
  const furniture = nRooms * cfg.furniture_per_room + cfg.furniture_common;
  // Los muebles se cambian cada `furniture_years`: se aparta cada año la parte proporcional.
  const furnitureReserve = cfg.furniture_years > 0 ? furniture / cfg.furniture_years : 0;

  function build(key: ScenarioKey): Scenario {
    const isRooms = key === "rooms";
    let monthly = isRooms ? nRooms * roomRent : whole;
    let capped = false;
    if (isRooms && cfg.cap_rooms_to_whole && monthly > whole) {
      monthly = whole;
      capped = true;
    }
    const vacancy = isRooms ? cfg.vacancy_months_rooms : cfg.vacancy_months_whole;
    const occupied = Math.max(0, 12 - vacancy);
    const effective = monthly * occupied;
    const pctCosts = cfg.default_insurance_pct + cfg.maintenance_pct + cfg.management_pct;

    const opex = [
      { label: "Comunidad", amount: community },
      { label: "IBI", amount: ibi },
      { label: "Seguro de hogar", amount: cfg.home_insurance_annual },
      { label: "Seguro de impago", amount: effective * cfg.default_insurance_pct },
      { label: "Mantenimiento", amount: effective * cfg.maintenance_pct },
      { label: "Gestión", amount: effective * cfg.management_pct },
      { label: "Reposición de muebles", amount: furnitureReserve },
      ...(isRooms ? [{ label: "Suministros", amount: cfg.utilities_monthly_rooms * occupied }] : []),
    ].filter((o) => o.amount > 0);
    const opexTotal = opex.reduce((s, o) => s + o.amount, 0);
    const noi = effective - opexTotal;

    const totalInvestment = price + purchase_costs + l.reform_cost + furniture;
    const cashInvested = totalInvestment - loan;
    const cashFlow = noi - annualDebt;

    // A Hacienda la reposición de muebles le llega como amortización: se quita del
    // resultado para no descontarla dos veces.
    const depreciation = price * cfg.building_share * cfg.building_depreciation + furnitureReserve;
    const taxable = Math.max(0, noi + furnitureReserve - interestY1 - depreciation) * (1 - cfg.rental_reduction);
    const tax = taxable * cfg.tax_rate;

    // Costes fijos (no dependen de la renta) que la renta tiene que cubrir.
    const fixed =
      community + ibi + cfg.home_insurance_annual + furnitureReserve + (isRooms ? cfg.utilities_monthly_rooms * occupied : 0);
    const perRoomYear = Math.max(1, nRooms) * occupied * (1 - pctCosts);
    const breakeven = perRoomYear > 0 ? (fixed + annualDebt) / perRoomYear : 0;

    return {
      key,
      label: isRooms ? "Por habitaciones" : "Piso entero a un grupo",
      monthly_rent: monthly,
      rent_per_room: nRooms > 0 ? monthly / nRooms : 0,
      capped,
      vacancy_months: vacancy,
      effective_income: effective,
      opex,
      opex_total: opexTotal,
      noi,
      furniture,
      total_investment: totalInvestment,
      gross_yield: price > 0 ? (monthly * 12) / price : 0,
      net_yield: totalInvestment > 0 ? noi / totalInvestment : 0,
      cash_invested: cashInvested,
      annual_debt_service: annualDebt,
      cash_flow: cashFlow,
      coc: cashInvested > 0 ? cashFlow / cashInvested : 0,
      coc_after_tax: cashInvested > 0 ? (cashFlow - tax) / cashInvested : 0,
      tax,
      cash_flow_after_tax: cashFlow - tax,
      breakeven_room_rent: breakeven,
    };
  }

  return {
    price,
    itp,
    purchase_costs,
    loan,
    monthly_payment: payment,
    rooms: build("rooms"),
    whole: build("whole"),
  };
}

export interface Verdict {
  ok: boolean;
  reasons: string[];
}

/** ¿Pasa el filtro? Usa el mejor de los dos escenarios. */
export function verdict(a: Analysis, walkMin: number | null, cfg: AppConfig): Verdict {
  const best = a.rooms.net_yield >= a.whole.net_yield ? a.rooms : a.whole;
  const reasons: string[] = [];
  if (best.net_yield < cfg.net_yield_good) reasons.push("neta por debajo del mínimo");
  if (best.coc_after_tax < cfg.coc_good) reasons.push("te queda poco dinero tras impuestos (cash-on-cash)");
  if (walkMin == null) reasons.push("sin ubicación");
  else if (walkMin > cfg.max_walk_minutes) reasons.push("lejos del campus");
  return { ok: reasons.length === 0, reasons };
}
