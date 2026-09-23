"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatTanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  judul: string;
  tanggal: string;
  deskripsi: string;
  mitigasi: string;
  submittedBy: string;
  targetLabels: string[];
  imagePreviewUrl?: string | null;
  onRemoveImage?: () => void;
  className?: string;
}

/**
 * Live mirror of what the Telegram message will look like. Not decoration:
 * a sent message can't be recalled, so seeing the assembled result while
 * typing is the cheapest place to catch a wrong date or an empty field.
 * The wording here tracks buildReportMessage() — if that changes, this
 * has to change with it.
 *
 * The photo sits above the text because that's the order the backend
 * sends it in (sendPhoto with the report as its caption), so the preview
 * matches what actually lands in the chat.
 */
export function TelegramPreview({
  judul,
  tanggal,
  deskripsi,
  mitigasi,
  submittedBy,
  targetLabels,
  imagePreviewUrl,
  onRemoveImage,
  className,
}: Props) {
  // Rendered only after mount: the clock differs between the server render
  // and the client's, which would otherwise be a hydration mismatch.
  const [time, setTime] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(
      new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
        Pratinjau pesan
      </span>

      <div className="rounded-lg bg-primary/[0.04] p-3">
        <div className="overflow-hidden rounded-lg bg-canvas shadow-[0_1px_2px_rgba(16,19,31,0.06)]">
          {imagePreviewUrl && (
            <div className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Lampiran laporan"
                className="max-h-48 w-full rounded-lg object-cover"
              />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  aria-label="Hapus gambar"
                  title="Hapus gambar"
                  className="absolute right-2 top-2 rounded-full bg-ink/60 p-1 text-white transition-colors hover:bg-ink/80"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="p-3.5">
            {/* Telegram's own sender blue, not the brand navy — this
                mirrors their UI, so it keeps their colour. */}
            <span className="text-[13px] font-semibold text-[#2f7bbf]">
              Tele Message Sender
            </span>

            <p
              className={cn(
                "mt-2 break-words text-[14px] font-medium",
                judul ? "text-ink" : "text-ink-faint"
              )}
            >
              {judul || "Judul laporan"}
            </p>

            <p className="mt-1.5 text-[13px] text-ink-muted-48">
              Tanggal: {formatTanggal(tanggal)}
            </p>
            <p className="text-[13px] text-ink-muted-48">
              Pelapor: {submittedBy}
            </p>

            <p className="mt-2.5 text-[13px] font-semibold text-ink-muted-80">
              Deskripsi
            </p>
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-[13px]",
                deskripsi ? "text-ink-muted-80" : "text-ink-faint"
              )}
            >
              {deskripsi || "Deskripsi akan tampil di sini."}
            </p>

            <p className="mt-2 text-[13px] font-semibold text-ink-muted-80">
              Mitigasi
            </p>
            <p
              className={cn(
                "whitespace-pre-wrap break-words text-[13px]",
                mitigasi ? "text-ink-muted-80" : "text-ink-faint"
              )}
            >
              {mitigasi || "Mitigasi akan tampil di sini."}
            </p>

            <span className="tabular mt-2.5 block text-right text-[11px] text-ink-faint">
              {time}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[12px] text-ink-muted-48">
        Dikirim ke{" "}
        {targetLabels.length ? (
          <span className="font-medium text-ink-muted-80">
            {targetLabels.join(", ")}
          </span>
        ) : (
          <span className="text-ink-faint">belum ada target</span>
        )}
      </p>
    </div>
  );
}
