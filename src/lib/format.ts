/**
 * Report dates are plain YYYY-MM-DD strings (a calendar day, not an
 * instant), so they're parsed at local midnight rather than as UTC —
 * `new Date("2026-09-03")` alone would be UTC midnight and render as the
 * 2nd for anyone behind UTC.
 *
 * Numeric day (no leading zero): "3 Sep 2026", not "03 Sep 2026".
 */
export function formatTanggal(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Timestamp for a submission row: "3 Sep 2026, 17.08". */
export function formatTimestamp(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
