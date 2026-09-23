import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { getPublicTargets } from "@/lib/targets";
import { HistoryTable } from "@/components/history-table";
import { AppShell } from "@/components/app-shell";
import { SubmitNotice } from "@/components/submit-notice";
import { Button } from "@/components/ui/button";

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
    <AppShell username={session?.username} reportCount={rows.length}>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">
              Riwayat Saya
            </h1>
            <p className="mt-1 text-[14px] text-ink-muted-48">
              Daftar laporan yang pernah Anda kirim, lengkap dengan status dan
              target pengirimannya.
            </p>
          </div>
          <Link href="/form">
            <Button>
              <Plus />
              Laporan Baru
            </Button>
          </Link>
        </div>

        <SubmitNotice />

        <HistoryTable
          reports={rows}
          targetLabels={Object.fromEntries(
            getPublicTargets().map((t) => [t.key, t.label])
          )}
        />
      </main>
    </AppShell>
  );
}
