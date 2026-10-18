import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_CONFIG, type AppConfig } from "./config.ts";
import { analyze as analyzeWith, monthlyPayment, verdict, type Market } from "./finance.ts";
import type { Listing } from "./types.ts";

const base: Listing = {
  id: 1,
  city_id: "zaragoza",
  url: "",
  external_id: "",
  title: "",
  address: "",
  price: 200000,
  size_m2: 100,
  rooms: 4,
  bathrooms: 2,
  floor: "",
  elevator: true,
  community_monthly: 50,
  ibi_annual: 400,
  rentable_rooms: null,
  room_rent: null,
  whole_rent: null,
  reform_cost: 0,
  lat: null,
  lng: null,
  status: "pendiente",
  notes: "",
  created_at: "",
  updated_at: "",
};

// Zaragoza, como en la versión de una sola ciudad.
const ZGZ: Market = { room_rent: 375, whole_rent_m2: 12.3, itp_pct: 0.08 };
const analyze = (l: Listing, cfg: AppConfig) => analyzeWith(l, cfg, ZGZ);

const near = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("cuota francesa: 140.000 € al 3,5 % a 25 años ≈ 700,87 €; a 30 años ≈ 628,66 €", () => {
  near(monthlyPayment(140000, 0.035, 25), 700.87);
  near(monthlyPayment(140000, 0.035, 30), 628.66);
  near(monthlyPayment(1200, 0, 1), 100);
  assert.equal(monthlyPayment(0, 0.035, 25), 0);
});

test("sin tope: por habitaciones cobra 4 × 375 y entero 12,3 €/m² × 100", () => {
  const cfg: AppConfig = { ...DEFAULT_CONFIG, cap_rooms_to_whole: false };
  const a = analyze(base, cfg);
  assert.equal(a.rooms.monthly_rent, 1500);
  assert.equal(a.rooms.capped, false);
  assert.equal(a.whole.monthly_rent, 1230);
  near(a.itp, 16000);
  near(a.rooms.gross_yield, 0.09);
  // 10,5 meses ocupados por habitaciones; 11 meses entero
  near(a.rooms.effective_income, 15750);
  near(a.whole.effective_income, 13530);
});

test("por defecto no hay tope", () => {
  assert.equal(DEFAULT_CONFIG.cap_rooms_to_whole, false);
  assert.equal(analyze(base, DEFAULT_CONFIG).rooms.monthly_rent, 1500);
});

test("con tope del decreto: habitaciones ≤ piso entero", () => {
  const a = analyze(base, { ...DEFAULT_CONFIG, cap_rooms_to_whole: true });
  assert.equal(a.rooms.monthly_rent, 1230);
  assert.equal(a.rooms.capped, true);
  near(a.rooms.rent_per_room, 307.5);
});

test("la renta de equilibrio deja el flujo de caja en 0", () => {
  const cfg: AppConfig = { ...DEFAULT_CONFIG, cap_rooms_to_whole: false };
  const a = analyze(base, cfg);
  const b = analyze({ ...base, room_rent: a.rooms.breakeven_room_rent }, cfg);
  near(b.rooms.cash_flow, 0, 0.5);
});

test("sin hipoteca no hay préstamo, ni tasación, y el dinero puesto es la inversión", () => {
  const cfg: AppConfig = { ...DEFAULT_CONFIG, use_mortgage: false };
  const a = analyze(base, cfg);
  assert.equal(a.loan, 0);
  near(a.purchase_costs, 16000 + cfg.notary_registry + cfg.gestoria);
  near(a.rooms.cash_invested, a.rooms.total_investment);
  near(a.rooms.cash_flow, a.rooms.noi);
});

test("el impuesto nunca es negativo", () => {
  const a = analyze({ ...base, room_rent: 50, whole_rent: 100 }, DEFAULT_CONFIG);
  assert.equal(a.rooms.tax, 0);
  assert.equal(a.whole.tax, 0);
});

test("por defecto los suministros los pagan los inquilinos", () => {
  const a = analyze(base, DEFAULT_CONFIG);
  assert.equal(a.rooms.opex.some((o) => o.label === "Suministros"), false);
  const b = analyze(base, { ...DEFAULT_CONFIG, utilities_monthly_rooms: 150 });
  near(b.rooms.opex.find((o) => o.label === "Suministros")!.amount, 150 * 10.5);
});

test("veredicto: falla sin ubicación o lejos del campus", () => {
  const cfg: AppConfig = { ...DEFAULT_CONFIG, net_yield_good: 0, coc_good: -1 };
  const a = analyze(base, cfg);
  assert.equal(verdict(a, 10, cfg).ok, true);
  assert.deepEqual(verdict(a, null, cfg).reasons, ["sin ubicación"]);
  assert.deepEqual(verdict(a, 60, cfg).reasons, ["lejos del campus"]);
});

test("las rentas de referencia y el ITP salen de la ciudad", () => {
  const jaen: Market = { room_rent: 230, whole_rent_m2: 7.5, itp_pct: 0.07 };
  const a = analyzeWith(base, DEFAULT_CONFIG, jaen);
  assert.equal(a.rooms.monthly_rent, 920);
  assert.equal(a.whole.monthly_rent, 750);
  near(a.itp, 14000);
});
