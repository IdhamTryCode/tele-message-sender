"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, Label, FieldError } from "@/components/ui/card";

type Step =
  | { kind: "username" }
  | { kind: "setup"; username: string; qrDataUrl: string; manualKey: string }
  | { kind: "code"; username: string };

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "username" });
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Guards against a native (non-JS) form submission if a user clicks
  // before React has hydrated: without onSubmit attached yet, a <form>
  // with no explicit method defaults to GET on the current URL, which
  // would reload the page and leak the username into the query string.
  // Disabling the button until mount makes that window effectively
  // impossible to hit; method="post" below is the fallback in case it
  // ever is (keeps the value out of the URL either way).
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Deliberate exception to the "don't setState in an effect" rule: this
    // specifically needs to distinguish the initial (server-rendered, not
    // yet hydrated) render from every render after — there's no prop or
    // derived value that captures "has this component hydrated on the
    // client" other than an effect that only runs post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  async function handleUsernameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Terjadi kesalahan. Coba lagi.");
        return;
      }
      if (data.setupRequired) {
        setStep({
          kind: "setup",
          username,
          qrDataUrl: data.qrDataUrl,
          manualKey: data.manualKey,
        });
      } else {
        setStep({ kind: "code", username });
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind === "username") return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: step.username, code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal masuk. Coba lagi.");
        return;
      }
      router.push("/form");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  function backToUsername() {
    setStep({ kind: "username" });
    setCode("");
    setError(null);
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
        {step.kind === "username" && (
          <>
            <h1 className="text-[28px] font-semibold text-ink mb-1">Masuk</h1>
            <p className="text-[14px] text-ink-muted-48 mb-6">
              Masukkan username Anda untuk melanjutkan.
            </p>
            <form
              onSubmit={handleUsernameSubmit}
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
              <FieldError message={error ?? undefined} />
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={submitting || !mounted}
              >
                {submitting && <Spinner />}
                {submitting ? "Memeriksa..." : "Lanjut"}
              </Button>
            </form>
          </>
        )}

        {step.kind === "setup" && (
          <>
            <h1 className="text-[28px] font-semibold text-ink mb-1">
              Setup Authenticator
            </h1>
            <p className="text-[14px] text-ink-muted-48 mb-4">
              Scan kode QR ini dengan Google Authenticator, Authy, atau
              aplikasi TOTP lain, lalu masukkan kode yang muncul untuk
              menyelesaikan setup.
            </p>
            <div className="flex justify-center mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.qrDataUrl}
                alt="QR code setup authenticator"
                className="rounded-lg border border-hairline"
                width={200}
                height={200}
              />
            </div>
            <p className="text-[12px] text-ink-muted-48 mb-4 break-all">
              Tidak bisa scan? Masukkan kunci ini secara manual:{" "}
              <span className="font-mono text-ink-muted-80">
                {step.manualKey}
              </span>
            </p>
            <form
              onSubmit={handleCodeSubmit}
              method="post"
              className="space-y-4"
            >
              <div>
                <Label htmlFor="code">Kode Konfirmasi</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
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
                {submitting ? "Memverifikasi..." : "Konfirmasi & Masuk"}
              </Button>
              <button
                type="button"
                onClick={backToUsername}
                className="w-full text-center text-[14px] text-ink-muted-48 hover:text-ink hover:underline"
              >
                Ganti username
              </button>
            </form>
          </>
        )}

        {step.kind === "code" && (
          <>
            <h1 className="text-[28px] font-semibold text-ink mb-1">Masuk</h1>
            <p className="text-[14px] text-ink-muted-48 mb-6">
              Masukkan kode dari aplikasi authenticator Anda.
            </p>
            <form
              onSubmit={handleCodeSubmit}
              method="post"
              className="space-y-4"
            >
              <div>
                <Label htmlFor="code">Kode Authenticator</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
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
                {submitting ? "Memverifikasi..." : "Masuk"}
              </Button>
              <button
                type="button"
                onClick={backToUsername}
                className="w-full text-center text-[14px] text-ink-muted-48 hover:text-ink hover:underline"
              >
                Ganti username
              </button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
