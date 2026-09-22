import { getSession } from "@/lib/auth/session";
import { ReportForm } from "@/components/report-form";
import { Header } from "@/components/header";

export default async function FormPage() {
  const session = await getSession();

  return (
    <>
      <Header username={session?.username} active="form" />
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <ReportForm />
      </main>
    </>
  );
}
