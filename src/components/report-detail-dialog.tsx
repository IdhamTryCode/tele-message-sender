"use client";

import { useEffect } from "react";
import type { InferSelectModel } from "drizzle-orm";
import type { reports } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Report = InferSelectModel<typeof reports>;

const STATUS_LABEL: Record<string, string> = {
  sent: "Terkirim",
  failed: "Gagal",
  partial: "Sebagian gagal",
};

interface Props {
  report: Report;
  targetLabels: string[];
  onClose: () => void;
}

/**
 * Read-only view of a past submission. Images are deliberately never shown
 * here (or stored anywhere server-side) — validateAndSanitizeImage() in
 * lib/image.ts streams the sanitized buffer straight to Telegram and never
 * persists it, by design, so there's nothing to display for hasImage=true
 * beyond the fact that one was attached at send time.
 */
export function ReportDetailDialog({ report, targetLabels, onClose }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-[21px] font-semibold text-ink">{report.judul}</h2>
          <span className="shrink-0 text-[13px] text-ink-muted-48">
            {STATUS_LABEL[report.status] ?? report.status}
          </span>
        </div>
        <p className="text-[14px] text-ink-muted-48 mb-5">
          {new Date(report.createdAt).toLocaleString("id-ID")}
        </p>

        <dl className="space-y-3 text-[14px]">
          <div>
            <dt className="font-semibold text-ink-muted-80">Target</dt>
            <dd className="text-ink">{targetLabels.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Tanggal Kejadian</dt>
            <dd className="text-ink">{report.tanggal}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Deskripsi</dt>
            <dd className="text-ink whitespace-pre-wrap">{report.deskripsi}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Mitigasi</dt>
            <dd className="text-ink whitespace-pre-wrap">{report.mitigasi}</dd>
          </div>
          {report.hasImage && (
            <div>
              <dt className="font-semibold text-ink-muted-80">Gambar</dt>
              <dd className="text-[13px] text-ink-muted-48">
                Laporan ini menyertakan gambar saat dikirim. Gambar tidak
                disimpan di server (langsung diteruskan ke Telegram) sehingga
                tidak dapat ditampilkan ulang di sini — lihat riwayat chat
                Telegram target untuk melihatnya kembali.
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Tutup
          </Button>
        </div>
      </Card>
    </div>
  );
}
