import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { ReportForm } from "@/components/report-form";
import { LogoutButton } from "@/components/logout-button";

export default async function FormPage() {
  const session = await getSession();

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[14px] text-ink-muted-48">
          Masuk sebagai <strong className="text-ink">{session?.username}</strong>
        </span>
        <div className="flex items-center gap-4 text-[14px]">
          <Link href="/history" className="text-primary hover:underline">
            Riwayat
          </Link>
          <LogoutButton />
        </div>
      </div>
      <ReportForm />
    </main>
  );
}
