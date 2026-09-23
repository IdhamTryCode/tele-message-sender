"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import { ChevronRight, Plus, Search } from "lucide-react";
import type { reports } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ReportDetailDialog } from "@/components/report-detail-dialog";
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

function formatTanggal(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
        <div className="flex gap-1 rounded-lg border border-hairline bg-canvas p-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-[13px] transition-colors",
                filter === tab.key
                  ? "bg-canvas-parchment font-medium text-ink"
                  : "text-ink-muted-48 hover:text-ink"
              )}
            >
              {tab.label}
              <span className="tabular text-[12px] text-ink-faint">
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul atau target"
            aria-label="Cari laporan"
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-canvas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead>
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
              {visible.map((r) => {
                const keys = parseTargetKeys(r.targetKeys);
                const errors = parseTargetErrors(r.targetErrors);
                const errorCount = Object.keys(errors).length;
                return (
                  <tr
                    key={r.id}
                    onClick={() => setDetailReport(r)}
                    className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-canvas-subtle"
                  >
                    <td className="max-w-[260px] px-4 py-3">
                      <span className="block truncate font-medium text-ink">
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
                      {new Date(r.createdAt).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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

        {visible.length === 0 && (
          <p className="px-4 py-10 text-center text-[14px] text-ink-muted-48">
            Tidak ada laporan yang cocok dengan filter ini.
          </p>
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
