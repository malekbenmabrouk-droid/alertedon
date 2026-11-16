const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});
const shortFmt = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const relFmt = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });

export const today = () => toIsoDate(new Date());

export function toIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Local datetime "YYYY-MM-DDTHH:mm:ss" (the API expects naive datetimes). */
export function toIsoLocal(d: Date): string {
  return `${toIsoDate(d)}T${d.toTimeString().slice(0, 8)}`;
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? dateTimeFmt.format(new Date(iso)) : "—");
/** Compact "16/11 08:12" for dense tables. */
export const formatShort = (iso: string | null | undefined) => (iso ? shortFmt.format(new Date(iso)) : "—");
export const formatPercent = (ratio: number) => `${Math.round(ratio * 100)}\u202F%`;

export function formatRelative(iso: string, now = new Date()): string {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return relFmt.format(Math.round(diff), "second");
  if (abs < 3600) return relFmt.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return relFmt.format(Math.round(diff / 3600), "hour");
  return relFmt.format(Math.round(diff / 86400), "day");
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}
