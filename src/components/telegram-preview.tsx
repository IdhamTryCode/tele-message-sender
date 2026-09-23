"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  judul: string;
  tanggal: string;
  deskripsi: string;
  mitigasi: string;
  submittedBy: string;
  targetLabels: string[];
  imagePreviewUrl?: string | null;
  className?: string;
}

/** Same format as buildReportMessage() in lib/telegram.ts, minus the sender line. */
function formatTanggal(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Live mirror of what the Telegram message will look like. Not decoration:
 * a sent message can't be recalled, so seeing the assembled result while
 * typing is the cheapest place to catch a wrong date or an empty field.
 * The wording here tracks buildReportMessage() — if that changes, this
 * has to change with it.
 */
export function TelegramPreview({
  judul,
  tanggal,
  deskripsi,
  mitigasi,
  submittedBy,
  targetLabels,
  imagePreviewUrl,
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
        <div className="rounded-lg bg-canvas p-3.5 shadow-[0_1px_2px_rgba(16,19,31,0.06)]">
          <span className="text-[13px] font-semibold text-primary">
            Tele Message Sender
          </span>

          {imagePreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreviewUrl}
              alt=""
              className="mt-2 max-h-40 w-full rounded-lg object-cover"
            />
          )}

          <p
            className={cn(
              "mt-2 text-[14px] font-medium break-words",
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
              "text-[13px] whitespace-pre-wrap break-words",
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
              "text-[13px] whitespace-pre-wrap break-words",
              mitigasi ? "text-ink-muted-80" : "text-ink-faint"
            )}
          >
            {mitigasi || "Mitigasi akan tampil di sini."}
          </p>

          <span className="mt-2.5 block text-right tabular text-[11px] text-ink-faint">
            {time}
          </span>
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
