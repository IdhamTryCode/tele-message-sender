import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { ownReports } from "@/lib/reports";
import { ReportForm } from "@/components/report-form";
import { AppShell } from "@/components/app-shell";
import { PageEyebrow } from "@/components/page-eyebrow";

export default async function FormPage() {
  // proxy.ts only verifies the cookie's signature; getSession() also
  // confirms the user behind it still exists. So this redirect is what
  // turns away a deleted user whose cookie is still validly signed.
  const session = await getSession();
  if (!session) redirect("/login");

  const [countRow] = await db
    .select({ value: count() })
    .from(reports)
    .where(ownReports(session));

  return (
    <AppShell username={session.username} reportCount={countRow?.value}>
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
          <ReportForm username={session.username} />
        </div>
      </main>
    </AppShell>
  );
}
