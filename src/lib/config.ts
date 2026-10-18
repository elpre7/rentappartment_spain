/**
 * Constantes del modelo financiero, comunes a todas las ciudades. Las
 * fracciones se guardan como tal (0.08, no 8). Los valores editados en
 * /settings se guardan en la tabla `settings` y pisan estos defaults.
 * Lo que depende de la ciudad (rentas de referencia e ITP) vive en `cities`.
 */
export interface AppConfig {
  // Costes de compra (el ITP es de cada ciudad)
  notary_registry: number;
  gestoria: number;
  appraisal: number;

  // Hipoteca
  use_mortgage: boolean;
  ltv: number;
  mortgage_rate: number;
  mortgage_years: number;

  // Explotación
  vacancy_months_rooms: number;
  vacancy_months_whole: number;
  utilities_monthly_rooms: number;
  home_insurance_annual: number;
  default_insurance_pct: number;
  maintenance_pct: number;
  management_pct: number;
  ibi_pct_of_price: number;
  furniture_per_room: number;
  furniture_common: number;

  // Regulación: la suma de las habitaciones no puede superar la renta del piso entero
  cap_rooms_to_whole: boolean;

  // Impuestos
  tax_rate: number;
  rental_reduction: number;
  building_share: number;
  building_depreciation: number;
  furniture_years: number;

  // Umbrales
  net_yield_good: number;
  coc_good: number;
  max_walk_minutes: number;
}

export const DEFAULT_CONFIG: AppConfig = {
  notary_registry: 1500,
  gestoria: 400,
  appraisal: 400,

  use_mortgage: true,
  ltv: 0.7,
  mortgage_rate: 0.035,
  mortgage_years: 25,

  vacancy_months_rooms: 1.5,
  vacancy_months_whole: 1,
  utilities_monthly_rooms: 180,
  home_insurance_annual: 300,
  default_insurance_pct: 0.04,
  maintenance_pct: 0.05,
  management_pct: 0,
  ibi_pct_of_price: 0.002,
  furniture_per_room: 1200,
  furniture_common: 2500,

  cap_rooms_to_whole: false,

  tax_rate: 0.19,
  rental_reduction: 0,
  building_share: 0.5,
  building_depreciation: 0.03,
  furniture_years: 10,

  net_yield_good: 0.05,
  coc_good: 0.06,
  max_walk_minutes: 25,
};

/** Etiquetas y unidades para pintar el formulario de Ajustes. */
export type FieldKind = "eur" | "pct" | "num" | "bool";

export const CONFIG_SECTIONS: {
  title: string;
  fields: { key: keyof AppConfig; label: string; kind: FieldKind; help?: string }[];
}[] = [
  {
    title: "Costes de compra (el ITP se configura en cada ciudad)",
    fields: [
      { key: "notary_registry", label: "Notaría + registro", kind: "eur" },
      { key: "gestoria", label: "Gestoría", kind: "eur" },
      { key: "appraisal", label: "Tasación (solo con hipoteca)", kind: "eur" },
    ],
  },
  {
    title: "Hipoteca",
    fields: [
      { key: "use_mortgage", label: "Comprar con hipoteca", kind: "bool" },
      { key: "ltv", label: "Financiación sobre precio (LTV)", kind: "pct", help: "No residentes suelen conseguir 60–70 %." },
      { key: "mortgage_rate", label: "Tipo de interés", kind: "pct" },
      { key: "mortgage_years", label: "Plazo (años)", kind: "num" },
    ],
  },
  {
    title: "Explotación",
    fields: [
      { key: "vacancy_months_rooms", label: "Meses vacíos al año (por habitaciones)", kind: "num", help: "Verano: los estudiantes se van en julio/agosto." },
      { key: "vacancy_months_whole", label: "Meses vacíos al año (piso entero)", kind: "num" },
      { key: "utilities_monthly_rooms", label: "Suministros que pagas tú (por habitaciones, €/mes)", kind: "eur", help: "Luz, agua, gas e internet." },
      { key: "home_insurance_annual", label: "Seguro de hogar (€/año)", kind: "eur" },
      { key: "default_insurance_pct", label: "Seguro de impago (% de la renta)", kind: "pct" },
      { key: "maintenance_pct", label: "Mantenimiento (% de la renta)", kind: "pct" },
      { key: "management_pct", label: "Gestión/agencia (% de la renta)", kind: "pct" },
      { key: "ibi_pct_of_price", label: "IBI estimado (% del precio, si no lo pones a mano)", kind: "pct" },
      { key: "furniture_per_room", label: "Muebles por habitación (€)", kind: "eur" },
      { key: "furniture_common", label: "Muebles zonas comunes (€)", kind: "eur" },
    ],
  },
  {
    title: "Regulación",
    fields: [
      {
        key: "cap_rooms_to_whole",
        label: "Aplicar tope: habitaciones ≤ piso entero",
        kind: "bool",
        help: "Desactivado por defecto. Actívalo si se aprueba la norma que limita el alquiler por habitaciones.",
      },
    ],
  },
  {
    title: "Impuestos",
    fields: [
      { key: "tax_rate", label: "Tipo impositivo sobre el rendimiento", kind: "pct", help: "No residente UE (IRNR): 19 %. Residente: tu tipo marginal de IRPF." },
      { key: "rental_reduction", label: "Reducción por alquiler de vivienda", kind: "pct", help: "Habitaciones/temporada para estudiantes: normalmente 0 %." },
      { key: "building_share", label: "Parte del precio que es construcción", kind: "pct", help: "Según el valor catastral del recibo del IBI." },
      { key: "building_depreciation", label: "Amortización anual de la construcción", kind: "pct" },
      { key: "furniture_years", label: "Años para amortizar muebles", kind: "num" },
    ],
  },
  {
    title: "Umbrales del veredicto",
    fields: [
      { key: "net_yield_good", label: "Rentabilidad neta mínima", kind: "pct" },
      { key: "coc_good", label: "Cash-on-cash mínimo", kind: "pct" },
      { key: "max_walk_minutes", label: "Máximo andando al campus más cercano (min)", kind: "num" },
    ],
  },
];

/** Mezcla valores guardados con los defaults, ignorando claves desconocidas o de tipo erróneo. */
export function mergeConfig(stored: Record<string, unknown>): AppConfig {
  const cfg: AppConfig = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof AppConfig)[]) {
    const v = stored[key];
    if (typeof v === typeof DEFAULT_CONFIG[key]) {
      (cfg as unknown as Record<string, unknown>)[key] = v;
    }
  }
  return cfg;
}
