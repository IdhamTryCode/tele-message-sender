import { getSession } from "@/lib/auth/session";
import { ReportForm } from "@/components/report-form";
import { Header } from "@/components/header";

export default async function FormPage() {
  const session = await getSession();

  return (
    <>
      <Header username={session?.username} active="form" />
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-2xl mb-6">
          <h1 className="text-[28px] font-semibold text-ink">Laporan Baru</h1>
          <p className="mt-1 text-[14px] text-ink-muted-48">
            Isi detail laporan di bawah, lalu pilih target sebelum mengirim
            ke Telegram.
          </p>
        </div>
        <ReportForm />
      </main>
    </>
  );
}
