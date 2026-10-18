const eurFmt = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function eur(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? "—" : eurFmt.format(n);
}

export function pct(n: number | null | undefined, digits = 1): string {
  return n == null || !Number.isFinite(n) ? "—" : `${(n * 100).toFixed(digits).replace(".", ",")} %`;
}

export function num(n: number | null | undefined, digits = 0): string {
  return n == null || !Number.isFinite(n) ? "—" : n.toFixed(digits).replace(".", ",");
}
