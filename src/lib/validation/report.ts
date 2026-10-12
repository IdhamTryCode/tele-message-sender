import { z } from "zod";

/**
 * Returns today's date as YYYY-MM-DD, one day ahead of the server's UTC
 * clock. This is a report of something that already happened, so a future
 * date shouldn't be accepted — but the server (Vercel) runs on UTC while
 * users are in WIB (UTC+7). A same-day-only UTC check would wrongly
 * reject a genuinely "today" submission made late at night WIB (which is
 * still "yesterday" in UTC), so the cutoff is deliberately one day ahead
 * of UTC rather than exactly "today" in either timezone.
 */
function maxAllowedDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const JUDUL_FORBIDDEN =
  /[\p{Cc}\u2028\u2029\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/u;

/**
 * Source of truth for report field validation. Used both client-side (via
 * @hookform/resolvers/zod, for instant UX feedback) and server-side in the
 * /api/reports route handler — the server check is the one that actually
 * matters; client-side validation can always be bypassed.
 */
export const reportSchema = z.object({
  // The title lands on the first line of a plain-text Telegram message,
  // above "Tanggal:" and "Dikirim oleh:", so a title carrying a line break
  // (e.g. via the API, which the single-line browser input doesn't stop)
  // would forge extra header lines above the real sender. Reject any control
  // character (Cc covers \n, \r, \t) or line/paragraph separator \u2014 and the
  // bidirectional controls, which can't add a line but can visually reorder
  // the one the title sits on. Other format characters are left alone on
  // purpose: the zero-width joiner is what holds compound emoji together.
  judul: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter")
    .refine((val) => !JUDUL_FORBIDDEN.test(val), {
      message: "Judul tidak boleh mengandung baris baru atau karakter kontrol",
    }),
  tanggal: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
    .refine((val) => val <= maxAllowedDate(), {
      message: "Tanggal tidak boleh di masa depan",
    }),
  // Capped well under Telegram's 4096-char message limit, not at some
  // round number — buildReportMessage() in lib/telegram.ts wraps both
  // fields together with a fixed-size template (labels, judul, tanggal,
  // submittedBy). Worst case (judul at its 200-char max, submittedBy at
  // its 50-char max, both fields at this cap) measures 4099 chars — this
  // value is verified against that actual worst case, not derived from a
  // rough overhead estimate. The route's fitsAsMessage() check is the
  // real safety net regardless; this cap just keeps normal usage from
  // ever tripping it.
  deskripsi: z
    .string()
    .trim()
    .min(10, "Deskripsi minimal 10 karakter")
    .max(1850, "Deskripsi maksimal 1850 karakter"),
  mitigasi: z
    .string()
    .trim()
    .min(10, "Mitigasi minimal 10 karakter")
    .max(1850, "Mitigasi maksimal 1850 karakter"),
  // The route resolves every key against a server-side whitelist and sends
  // one Telegram message per key in a loop, so duplicates or an oversized
  // array would let a single request flood one group and sidestep the
  // per-user rate limit. Duplicates are rejected outright, not deduped.
  targetKeys: z
    .array(z.string().max(50, "Nama target maksimal 50 karakter"))
    .min(1, "Pilih minimal satu target")
    .max(20, "Maksimal 20 target")
    .refine((keys) => new Set(keys).size === keys.length, {
      message: "Target tidak boleh duplikat",
    }),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
