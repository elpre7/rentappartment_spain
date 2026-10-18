export const STATUSES = [
  { key: "pendiente", label: "Pendiente" },
  { key: "contactado", label: "Contactado" },
  { key: "visitado", label: "Visitado" },
  { key: "oferta", label: "Oferta" },
  { key: "comprado", label: "Comprado" },
  { key: "descartado", label: "Descartado" },
] as const;

export type Status = (typeof STATUSES)[number]["key"];

export interface Listing {
  id: number;
  city_id: string;
  url: string;
  external_id: string;
  title: string;
  address: string;
  price: number;
  size_m2: number;
  rooms: number;
  bathrooms: number | null;
  floor: string;
  elevator: boolean | null;
  community_monthly: number | null;
  ibi_annual: number | null;
  /** Habitaciones que alquilas; null = todas. */
  rentable_rooms: number | null;
  /** Renta por habitación propia de este piso; null = la de Ajustes. */
  room_rent: number | null;
  /** Renta del piso entero propia de este piso (€/mes); null = €/m² de Ajustes × m². */
  whole_rent: number | null;
  reform_cost: number;
  lat: number | null;
  lng: number | null;
  status: Status;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Campos que se pueden crear/editar desde la API. */
export type ListingInput = Partial<Omit<Listing, "id" | "created_at" | "updated_at">>;

export interface City {
  /** Identificador corto, p. ej. "zaragoza". */
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  /** Renta por habitación de referencia (€/mes). */
  room_rent: number;
  /** Renta de piso entero de referencia (€/m²/mes). */
  whole_rent_m2: number;
  itp_pct: number;
  /** De dónde salen las rentas de referencia (se enseña en la ficha). */
  rent_source: string;
  active: boolean;
}

export interface Campus {
  id: number;
  city_id: string;
  name: string;
  university: string;
  lat: number;
  lng: number;
  active: boolean;
}
