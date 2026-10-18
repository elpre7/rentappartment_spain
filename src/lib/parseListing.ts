import type { ListingInput } from "./types";

/** Lo que manda el marcador desde la página del anuncio (todo texto). */
export interface CapturedPage {
  url?: string;
  title?: string;
  address?: string;
  price?: string;
  features?: string;
  text?: string;
}

/** "185.000 €" → 185000. Ignora céntimos y separadores de miles. */
export function parseEuros(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/\s/g, "").match(/(\d{1,3}(?:[.,]\d{3})+|\d+)(?:,\d{1,2})?€/);
  const raw = m ? m[1] : s.match(/\d{1,3}(?:\.\d{3})+|\d{4,}/)?.[0];
  if (!raw) return undefined;
  const n = Number(raw.replace(/[.,]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function firstInt(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? Number(m[1].replace(/\./g, "")) : undefined;
}

/** Id del anuncio a partir de la URL (idealista: /inmueble/123456/). */
export function externalIdFromUrl(url: string): string {
  const idealista = url.match(/idealista\.com\/(?:[a-z]{2}\/)?inmueble\/(\d+)/);
  if (idealista) return `idealista:${idealista[1]}`;
  const fotocasa = url.match(/fotocasa\.es\/.*\/(\d{6,})\/d/);
  if (fotocasa) return `fotocasa:${fotocasa[1]}`;
  return "";
}

/**
 * Saca lo que pueda de un anuncio (idealista, fotocasa o texto pegado a mano).
 * Es best-effort: todo lo que devuelva se revisa en el formulario antes de guardar.
 */
export function parseListing(page: CapturedPage): ListingInput {
  const text = [page.features, page.text].filter(Boolean).join("\n");
  const out: ListingInput = {};

  if (page.url) {
    out.url = page.url.split("?")[0];
    out.external_id = externalIdFromUrl(out.url);
  }
  if (page.title) out.title = page.title.trim();
  if (page.address) out.address = page.address.trim();

  const price = parseEuros(page.price) ?? parseEuros(text.match(/[\d.]+\s*€(?!\s*\/\s*m)/)?.[0]);
  if (price) out.price = price;

  // "90 m² construidos" va antes que "75 m² útiles" en idealista: nos quedamos el primero.
  const m2 = firstInt(text, /(\d{2,4})\s*m(?:²|2)(?![a-z\d])/i);
  if (m2) out.size_m2 = m2;

  const rooms = firstInt(text, /(\d{1,2})\s*(?:hab\.?|habitaci(?:o|ó)n(?:es)?|dormitorios?)\b/i);
  if (rooms) out.rooms = rooms;

  const baths = firstInt(text, /(\d{1,2})\s*baños?\b/i);
  if (baths) out.bathrooms = baths;

  const floor = text.match(/(Planta\s+\d+ª?|\d+ª\s+planta|Bajo|Entreplanta|Ático)/i);
  if (floor) out.floor = floor[1];

  if (/sin ascensor/i.test(text)) out.elevator = false;
  else if (/con ascensor|\bascensor\b/i.test(text)) out.elevator = true;

  const community = text.match(/(?:gastos de )?comunidad[^\d]{0,30}(\d{1,4})(?:,\d{1,2})?\s*€/i);
  if (community) out.community_monthly = Number(community[1]);

  if (!out.title && page.text) {
    const firstLine = page.text.split("\n").map((s) => s.trim()).find((s) => s.length > 10);
    if (firstLine) out.title = firstLine.slice(0, 140);
  }
  return out;
}
