"use client";

import { AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ReportInput } from "@/lib/validation/report";

interface Props {
  data: ReportInput;
  targetLabels: string[];
  imagePreviewUrl: string | null;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shown right before the final send. A Telegram message can't be recalled
 * once read, so this confirmation step is a security control, not just UX —
 * it's the last chance to catch a wrong target or a typo before it becomes
 * an incident of its own.
 */
export function ReportPreviewDialog({
  data,
  targetLabels,
  imagePreviewUrl,
  submitting,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <Card className="flex max-h-[85vh] w-full max-w-lg flex-col">
        <div className="border-b border-hairline p-5">
          <h2 className="text-[18px] font-semibold text-ink">
            Periksa sebelum mengirim
          </h2>
          <p className="mt-1.5 flex gap-2 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Pesan tidak dapat ditarik kembali setelah terkirim ke Telegram.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-[14px]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Target
            </p>
            <span className="mt-1.5 flex flex-wrap gap-1.5">
              {targetLabels.map((label) => (
                <Badge key={label} variant="outline">
                  {label}
                </Badge>
              ))}
            </span>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Judul
            </p>
            <p className="mt-1 break-words text-ink">{data.judul}</p>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Tanggal
            </p>
            <p className="mt-1 text-ink">{data.tanggal}</p>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Deskripsi
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-ink">
              {data.deskripsi}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
              Mitigasi
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-ink">
              {data.mitigasi}
            </p>
          </div>

          {imagePreviewUrl && (
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-faint">
                Gambar
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Pratinjau lampiran"
                className="mt-1.5 max-h-48 rounded-lg border border-hairline"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-hairline p-5">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Kembali
          </Button>
          <Button onClick={onConfirm} loading={submitting} className="flex-1">
            {!submitting && <Send />}
            {submitting ? "Mengirim..." : "Kirim ke Telegram"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
