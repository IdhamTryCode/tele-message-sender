import Link from "next/link";
import type { InferSelectModel } from "drizzle-orm";
import type { reports } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";

type Report = InferSelectModel<typeof reports>;

const STATUS_LABEL: Record<string, string> = {
  sent: "Terkirim",
  failed: "Gagal",
  partial: "Sebagian gagal",
};

const STATUS_CLASS: Record<string, string> = {
  sent: "text-success font-semibold",
  failed: "text-danger font-semibold",
  partial: "text-primary font-semibold",
};

function parseTargetKeys(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [raw];
  } catch {
    // Pre-migration rows stored a single plain string, not JSON.
    return [raw];
  }
}

export function HistoryTable({
  reports,
  targetLabels,
}: {
  reports: Report[];
  targetLabels: Record<string, string>;
}) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-hairline bg-canvas p-10 text-center">
        <p className="text-[14px] text-ink-muted-48 mb-4">
          Belum ada laporan yang dikirim.
        </p>
        <Link href="/form">
          <Button variant="secondary">Buat Laporan Baru</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="border-b border-hairline bg-canvas-parchment text-left">
            <th className="px-4 py-3 font-semibold text-ink-muted-80">
              Judul
            </th>
            <th className="px-4 py-3 font-semibold text-ink-muted-80">
              Tanggal
            </th>
            <th className="px-4 py-3 font-semibold text-ink-muted-80">
              Target
            </th>
            <th className="px-4 py-3 font-semibold text-ink-muted-80">
              Status
            </th>
            <th className="px-4 py-3 font-semibold text-ink-muted-80">
              Dikirim
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => {
            const keys = parseTargetKeys(r.targetKeys);
            const labels = keys.map((k) => targetLabels[k] ?? k).join(", ");
            return (
              <tr
                key={r.id}
                className="border-b border-hairline last:border-0"
              >
                <td className="px-4 py-3 text-ink">{r.judul}</td>
                <td className="px-4 py-3 text-ink-muted-80">{r.tanggal}</td>
                <td className="px-4 py-3 text-ink-muted-80">{labels}</td>
                <td className="px-4 py-3">
                  <span className={STATUS_CLASS[r.status] ?? "text-ink"}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted-48">
                  {new Date(r.createdAt).toLocaleString("id-ID")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
