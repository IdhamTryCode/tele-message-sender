"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import type { reports } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReportDetailDialog } from "@/components/report-detail-dialog";
import { formatTanggal, formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

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

const PAGE_SIZE = 20;

type Filter = "all" | "sent" | "failed";

export function parseTargetKeys(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    // Pre-migration rows stored a single plain string, not JSON.
    return [raw];
  }
}

function parseTargetErrors(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function HistoryTable({
  reports,
  targetLabels,
}: {
  reports: Report[];
  targetLabels: Record<string, string>;
}) {
  const [detailReport, setDetailReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const counts = useMemo(
    () => ({
      all: reports.length,
      // "partial" is a failure for filtering purposes — something didn't
      // get delivered, which is what someone scanning for problems cares
      // about, even though the submission itself went through.
      sent: reports.filter((r) => r.status === "sent").length,
      failed: reports.filter((r) => r.status !== "sent").length,
    }),
    [reports]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((r) => {
      if (filter === "sent" && r.status !== "sent") return false;
      if (filter === "failed" && r.status === "sent") return false;
      if (!q) return true;
      const labels = parseTargetKeys(r.targetKeys)
        .map((k) => targetLabels[k] ?? k)
        .join(" ");
      return (
        r.judul.toLowerCase().includes(q) || labels.toLowerCase().includes(q)
      );
    });
  }, [reports, filter, query, targetLabels]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  // Clamped during render rather than corrected in an effect: if the row
  // count shrinks out from under the current page (a report removed
  // server-side, say), this shows the last valid page immediately instead
  // of rendering an empty one and then re-rendering.
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = visible.slice(start, start + PAGE_SIZE);

  function applyFilter(next: Filter) {
    setFilter(next);
    setPage(1);
  }

  function applyQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline-strong bg-canvas p-12 text-center">
        <p className="text-[14px] text-ink-muted-48">
          Belum ada laporan yang dikirim.
        </p>
        <Link href="/form" className="mt-4 inline-block">
          <Button variant="secondary">
            <Plus />
            Buat Laporan Baru
          </Button>
        </Link>
      </div>
    );
  }

  const TABS: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "Semua" },
    { key: "sent", label: "Terkirim" },
    { key: "failed", label: "Gagal" },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-hairline bg-canvas p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => applyFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] transition-colors",
                filter === tab.key
                  ? "bg-brand-navy-soft font-medium text-brand-navy"
                  : "text-ink-muted-48 hover:text-ink"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "tabular text-[12px]",
                  filter === tab.key
                    ? "rounded-pill bg-brand-yellow px-1.5 py-0.5 text-[11px] font-semibold text-brand-navy"
                    : "text-ink-faint"
                )}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => applyQuery(e.target.value)}
            placeholder="Cari judul atau target"
            aria-label="Cari laporan"
            className="pl-9"
          />
        </div>
      </div>

      {/* No overflow-hidden here: a scroll container between the viewport
          and the sticky <thead> would cancel the stickiness. */}
      <div className="rounded-lg border border-hairline bg-canvas">
        {/* Below xl the same rows render as cards (see further down). The
            cutoff is xl, not lg, because the fixed 248px sidebar leaves a
            1024px screen too narrow for six columns — and sideways
            scrolling to reach the status column is exactly what someone
            scanning for failures shouldn't have to do. */}
        <div className="hidden xl:block">
          <table className="w-full text-[14px]">
            <thead className="sticky top-0 z-10 bg-canvas-subtle">
              <tr className="border-b border-hairline text-left">
                {["Judul", "Tanggal", "Target", "Status", "Dikirim"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
                    >
                      {h}
                    </th>
                  )
                )}
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => {
                const keys = parseTargetKeys(r.targetKeys);
                const errors = parseTargetErrors(r.targetErrors);
                const errorCount = Object.keys(errors).length;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetailReport(r)}
                    className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-canvas-highlight"
                  >
                    <td className="max-w-[260px] px-4 py-3">
                      <span
                        title={r.judul}
                        className="block truncate font-medium text-ink"
                      >
                        {r.judul}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted-48">
                      {formatTanggal(r.tanggal)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1">
                        {keys.slice(0, 2).map((k) => (
                          <Badge key={k} variant="neutral">
                            {targetLabels[k] ?? k}
                          </Badge>
                        ))}
                        {keys.length > 2 && (
                          <Badge variant="outline">+{keys.length - 2}</Badge>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge dot variant={STATUS_VARIANT[r.status] ?? "neutral"}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      {errorCount > 0 && (
                        <span className="mt-1 block text-[12px] text-ink-muted-48">
                          {errorCount} dari {keys.length} target gagal
                        </span>
                      )}
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-[13px] text-ink-muted-48">
                      {formatTimestamp(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="size-4 text-ink-faint" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Card list: the same data stacked, for phone and tablet widths. */}
        <ul className="xl:hidden">
          {pageRows.map((r) => {
            const keys = parseTargetKeys(r.targetKeys);
            const errors = parseTargetErrors(r.targetErrors);
            const errorCount = Object.keys(errors).length;
            return (
              <li key={r.id} className="border-b border-hairline last:border-0">
                <button
                  onClick={() => setDetailReport(r)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas-highlight"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">
                      {r.judul}
                    </span>
                    <span className="tabular mt-0.5 block text-[13px] text-ink-muted-48">
                      {formatTanggal(r.tanggal)} · {formatTimestamp(r.createdAt)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1">
                      <Badge dot variant={STATUS_VARIANT[r.status] ?? "neutral"}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                      {keys.slice(0, 2).map((k) => (
                        <Badge key={k} variant="neutral">
                          {targetLabels[k] ?? k}
                        </Badge>
                      ))}
                      {keys.length > 2 && (
                        <Badge variant="outline">+{keys.length - 2}</Badge>
                      )}
                    </span>
                    {errorCount > 0 && (
                      <span className="mt-1.5 block text-[12px] text-ink-muted-48">
                        {errorCount} dari {keys.length} target gagal
                      </span>
                    )}
                  </span>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-faint" />
                </button>
              </li>
            );
          })}
        </ul>

        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-ink-muted-48">
            Tidak ada laporan yang cocok dengan filter ini.
          </p>
        )}

        {visible.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
            <span className="tabular text-[13px] text-ink-muted-48">
              Menampilkan {start + 1}–
              {Math.min(start + PAGE_SIZE, visible.length)} dari{" "}
              {visible.length}
            </span>
            <div className="flex flex-1 items-center justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft />
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage >= pageCount}
              >
                Berikutnya
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>

      {detailReport && (
        <ReportDetailDialog
          report={detailReport}
          targetLabels={parseTargetKeys(detailReport.targetKeys).map(
            (k) => targetLabels[k] ?? k
          )}
          targetErrors={parseTargetErrors(detailReport.targetErrors)}
          allTargetLabels={targetLabels}
          onClose={() => setDetailReport(null)}
        />
      )}
    </>
  );
}
