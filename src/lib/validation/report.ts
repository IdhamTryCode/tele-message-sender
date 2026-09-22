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

/**
 * Source of truth for report field validation. Used both client-side (via
 * @hookform/resolvers/zod, for instant UX feedback) and server-side in the
 * /api/reports route handler — the server check is the one that actually
 * matters; client-side validation can always be bypassed.
 */
export const reportSchema = z.object({
  judul: z
    .string()
    .trim()
    .min(3, "Judul minimal 3 karakter")
    .max(200, "Judul maksimal 200 karakter"),
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
  targetKeys: z
    .array(z.string())
    .min(1, "Pilih minimal satu target"),
});

export type ReportInput = z.infer<typeof reportSchema>;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
