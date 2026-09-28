const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const int = new Intl.NumberFormat("pt-BR");
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatBRL = (value: number): string => brl.format(value);
/** Valores do banco são inteiros em centavos. */
export const formatCents = (cents: number): string => brl.format(cents / 100);
export const formatBRLCompact = (value: number): string => brlCompact.format(value);
export const formatInt = (value: number): string => int.format(value);
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso)).replace(".", "");
export const formatDateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));
export const formatPercent = (value: number, digits = 1): string =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
