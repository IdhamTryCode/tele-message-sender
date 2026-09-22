import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { getPublicTargets } from "@/lib/targets";
import { HistoryTable } from "@/components/history-table";
import { Header } from "@/components/header";
import { SubmitNotice } from "@/components/submit-notice";

export default async function HistoryPage() {
  const session = await getSession();

  // Defense in depth: proxy already redirects unauthenticated visits, but
  // this route re-derives the session itself rather than trusting proxy
  // (see src/proxy.ts for why). session is guaranteed non-null in practice
  // here since proxy protects this path, but we still scope the query to
  // the current user only — never all users' reports.
  const rows = session
    ? await db
        .select()
        .from(reports)
        .where(eq(reports.submittedBy, session.username))
        .orderBy(desc(reports.createdAt))
        .limit(100)
    : [];

  return (
    <>
      <Header username={session?.username} active="history" />
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-3xl mb-6">
          <h1 className="text-[28px] font-semibold text-ink">Riwayat Saya</h1>
          <p className="mt-1 text-[14px] text-ink-muted-48">
            Daftar laporan yang pernah Anda kirim, lengkap dengan status dan
            target pengirimannya.
          </p>
        </div>
        <div className="w-full max-w-3xl">
          <SubmitNotice />
          <HistoryTable
            reports={rows}
            targetLabels={Object.fromEntries(
              getPublicTargets().map((t) => [t.key, t.label])
            )}
          />
        </div>
      </main>
    </>
  );
}
