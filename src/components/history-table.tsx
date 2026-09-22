import type { InferSelectModel } from "drizzle-orm";
import type { reports } from "@/lib/db/schema";

type Report = InferSelectModel<typeof reports>;

export function HistoryTable({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-[14px] text-ink-muted-48">
        Belum ada laporan yang dikirim.
      </p>
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
          {reports.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-0">
              <td className="px-4 py-3 text-ink">{r.judul}</td>
              <td className="px-4 py-3 text-ink-muted-80">{r.tanggal}</td>
              <td className="px-4 py-3 text-ink-muted-80">{r.targetKey}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    r.status === "sent"
                      ? "text-success font-semibold"
                      : "text-danger font-semibold"
                  }
                >
                  {r.status === "sent" ? "Terkirim" : "Gagal"}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-muted-48">
                {new Date(r.createdAt).toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
