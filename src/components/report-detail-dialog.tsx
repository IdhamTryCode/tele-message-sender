"use client";

import { useEffect } from "react";
import type { InferSelectModel } from "drizzle-orm";
import { ImageOff, X } from "lucide-react";
import type { reports } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatTanggal, formatTimestamp } from "@/lib/format";

type Report = InferSelectModel<typeof reports>;

const STATUS_LABEL: Record<string, string> = {
  sent: "Terkirim",
  failed: "Gagal",
  partial: "Sebagian gagal",
};

const STATUS_VARIANT: Record<string, "success" | "danger" | "warning"> = {
  sent: "success",
  failed: "danger",
  partial: "warning",
};

interface Props {
  report: Report;
  targetLabels: string[];
  targetErrors: Record<string, string>;
  allTargetLabels: Record<string, string>;
  onClose: () => void;
}

/**
 * Read-only view of a past submission. Images are deliberately never shown
 * here (or stored anywhere server-side) — validateAndSanitizeImage() in
 * lib/image.ts streams the sanitized buffer straight to Telegram and never
 * persists it, by design, so there's nothing to display for hasImage=true
 * beyond the fact that one was attached at send time.
 */
export function ReportDetailDialog({
  report,
  targetLabels,
  targetErrors,
  allTargetLabels,
  onClose,
}: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const errorEntries = Object.entries(targetErrors);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <Card
        className="flex max-h-[85vh] w-full max-w-lg flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline p-5">
          <div className="min-w-0">
            <h2 className="text-[18px] font-semibold leading-snug text-ink">
              {report.judul}
            </h2>
            <p className="tabular mt-1 text-[13px] text-ink-muted-48">
              {formatTimestamp(report.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="shrink-0 rounded-lg p-1.5 text-ink-muted-48 transition-colors hover:bg-canvas-parchment hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-[14px]">
          <div className="flex flex-wrap items-center gap-2">
            <Badge dot variant={STATUS_VARIANT[report.status] ?? "neutral"}>
              {STATUS_LABEL[report.status] ?? report.status}
            </Badge>
            {targetLabels.map((label) => (
              <Badge key={label} variant="outline">
                {label}
              </Badge>
            ))}
          </div>

          {errorEntries.length > 0 && (
            <div className="rounded-lg bg-danger-soft p-3">
              <p className="text-[13px] font-medium text-danger">
                Gagal terkirim ke:
              </p>
              <ul className="mt-1 space-y-0.5">
                {errorEntries.map(([key, msg]) => (
                  <li key={key} className="text-[13px] text-danger">
                    <span className="font-medium">
                      {allTargetLabels[key] ?? key}:
                    </span>{" "}
                    {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Tanggal kejadian
            </p>
            <p className="mt-1 text-ink">{formatTanggal(report.tanggal)}</p>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Deskripsi
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-ink">
              {report.deskripsi}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Mitigasi
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-ink">
              {report.mitigasi}
            </p>
          </div>

          {report.hasImage && (
            <p className="flex gap-2.5 rounded-lg bg-canvas-parchment p-3 text-[13px] text-ink-muted-48">
              <ImageOff className="mt-0.5 size-4 shrink-0" />
              Laporan ini menyertakan gambar. Gambar tidak disimpan di server
              (langsung diteruskan ke Telegram), jadi tidak bisa ditampilkan
              ulang di sini — lihat riwayat chat Telegram target.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
