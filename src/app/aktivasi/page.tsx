"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/card";
import { TotpSetupStep } from "@/components/totp-setup-step";
import { AuthShowcase } from "@/components/auth-showcase";
import { BrandStripe } from "@/components/brand-stripe";

type Step =
  | { kind: "code" }
  | { kind: "setup"; qrDataUrl: string; manualKey: string };

const ACTIVATION_CODE_LENGTH = 8;

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
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <AuthShowcase />

      <main className="relative flex items-center justify-center bg-canvas-parchment px-6 py-12">
        <BrandStripe className="absolute inset-x-0 top-0" />
        <div className="w-full max-w-sm">
          {step.kind === "code" ? (
            <>
              <Image
                src="/bankjateng.png"
                alt="Bank Jateng"
                width={1280}
                height={591}
                className="h-11 w-auto"
                priority
              />
              <h1 className="mt-6 text-[30px] font-semibold tracking-tight text-ink">
                Aktivasi Akun
              </h1>
              <p className="mt-1 text-[14px] text-ink-muted-48">
                Masukkan username dan kode aktivasi yang diberikan admin.
              </p>

              <form
                onSubmit={handleActivateSubmit}
                method="post"
                className="mt-7 space-y-5"
              >
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    placeholder="nama.pengguna"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <Label htmlFor="activationCode" className="mb-0">
                      Kode Aktivasi
                    </Label>
                    <span className="tabular text-[12px] text-ink-faint">
                      {activationCode.length}/{ACTIVATION_CODE_LENGTH}
                    </span>
                  </div>
                  <Input
                    id="activationCode"
                    name="activationCode"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={ACTIVATION_CODE_LENGTH}
                    value={activationCode}
                    onChange={(e) =>
                      setActivationCode(e.target.value.toUpperCase())
                    }
                    placeholder="X7K9M4PQ"
                    className="font-mono tracking-[0.2em] placeholder:tracking-[0.2em]"
                    required
                  />
                </div>

                <p className="flex gap-2.5 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  Setelah aktivasi, Anda akan diminta memindai QR code dengan
                  aplikasi authenticator.
                </p>

                <FieldError message={error ?? undefined} />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={submitting}
                  disabled={!mounted}
                >
                  {submitting ? "Memeriksa..." : "Aktivasi"}
                </Button>
              </form>

              <p className="mt-6 border-t border-hairline pt-5 text-center text-[13px] text-ink-muted-48">
                Sudah punya akun aktif?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Masuk
                </Link>
              </p>
            </>
          ) : (
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
        </div>
      </main>
    </div>
  );
}
