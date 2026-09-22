"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <h2 className="text-[21px] font-semibold text-ink mb-1">
          Periksa sebelum mengirim
        </h2>
        <p className="text-[14px] text-ink-muted-48 mb-5">
          Pesan tidak dapat ditarik kembali setelah terkirim ke Telegram.
        </p>

        <dl className="space-y-3 text-[14px]">
          <div>
            <dt className="font-semibold text-ink-muted-80">Target</dt>
            <dd className="text-ink">{targetLabels.join(", ")}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Judul</dt>
            <dd className="text-ink">{data.judul}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Tanggal</dt>
            <dd className="text-ink">{data.tanggal}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Deskripsi</dt>
            <dd className="text-ink whitespace-pre-wrap">{data.deskripsi}</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-muted-80">Mitigasi</dt>
            <dd className="text-ink whitespace-pre-wrap">{data.mitigasi}</dd>
          </div>
          {imagePreviewUrl && (
            <div>
              <dt className="font-semibold text-ink-muted-80 mb-1.5">
                Gambar
              </dt>
              <dd>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Preview lampiran"
                  className="max-h-48 rounded-lg border border-hairline"
                />
              </dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1"
          >
            Kembali
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 gap-2"
          >
            {submitting && <Spinner />}
            {submitting ? "Mengirim..." : "Kirim ke Telegram"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
