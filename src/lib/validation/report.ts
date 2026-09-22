import { z } from "zod";

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
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"),
  deskripsi: z
    .string()
    .trim()
    .min(10, "Deskripsi minimal 10 karakter")
    .max(3000, "Deskripsi maksimal 3000 karakter"),
  mitigasi: z
    .string()
    .trim()
    .min(10, "Mitigasi minimal 10 karakter")
    .max(3000, "Mitigasi maksimal 3000 karakter"),
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
