"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, Label, FieldError } from "@/components/ui/card";
import { TotpSetupStep } from "@/components/totp-setup-step";

type Step =
  | { kind: "code" }
  | { kind: "setup"; qrDataUrl: string; manualKey: string };

export default function AktivasiPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "code" });
  const [username, setUsername] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // See src/app/login/page.tsx for why this guard exists.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  async function handleActivateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code: activationCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      setStep({
        kind: "setup",
        qrDataUrl: data.qrDataUrl,
        manualKey: data.manualKey,
      });
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Image
        src="/bankjateng.png"
        alt="Bank Jateng"
        width={200}
        height={92}
        className="mb-6 h-11 w-auto"
        priority
      />
      <Card className="w-full max-w-sm">
        {step.kind === "code" && (
          <>
            <h1 className="text-[28px] font-semibold text-ink mb-1">
              Aktivasi Akun
            </h1>
            <p className="text-[14px] text-ink-muted-48 mb-6">
              Masukkan username dan kode aktivasi yang diberikan admin.
            </p>
            <form
              onSubmit={handleActivateSubmit}
              method="post"
              className="space-y-4"
            >
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="activationCode">Kode Aktivasi</Label>
                <Input
                  id="activationCode"
                  name="activationCode"
                  autoComplete="off"
                  value={activationCode}
                  onChange={(e) =>
                    setActivationCode(e.target.value.toUpperCase())
                  }
                  placeholder="X7K9M4PQ"
                  required
                />
              </div>
              <FieldError message={error ?? undefined} />
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitting || !mounted}
              >
                {submitting && <Spinner />}
                {submitting ? "Memeriksa..." : "Aktivasi"}
              </Button>
            </form>
            <p className="mt-4 text-center text-[14px] text-ink-muted-48">
              Sudah punya akun aktif?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Masuk
              </Link>
            </p>
          </>
        )}

        {step.kind === "setup" && (
          <TotpSetupStep
            username={username}
            qrDataUrl={step.qrDataUrl}
            manualKey={step.manualKey}
            onConfirmed={() => {
              router.push("/form");
              router.refresh();
            }}
          />
        )}
      </Card>
    </main>
  );
}
