import { count, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { ReportForm } from "@/components/report-form";
import { AppShell } from "@/components/app-shell";
import { PageEyebrow } from "@/components/page-eyebrow";

export default async function FormPage() {
  const session = await getSession();

  // Defense in depth: proxy already redirects unauthenticated visits, but
  // this route re-derives the session itself rather than trusting proxy
  // (see src/proxy.ts for why).
  const [countRow] = session
    ? await db
        .select({ value: count() })
        .from(reports)
        .where(eq(reports.submittedBy, session.username))
    : [];

  return (
    <AppShell username={session?.username} reportCount={countRow?.value}>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
        <PageEyebrow />
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">
          Laporan Baru
        </h1>
        <p className="mt-1 text-[14px] text-ink-muted-48">
          Isi detail laporan di bawah, lalu pilih target sebelum mengirim ke
          Telegram.
        </p>
        <div className="mt-6">
          <ReportForm username={session?.username ?? ""} />
        </div>
      </main>
    </AppShell>
  );
}
