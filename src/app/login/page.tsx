"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Label, FieldError } from "@/components/ui/card";
import { OtpInput } from "@/components/ui/otp-input";
import { AuthShowcase } from "@/components/auth-showcase";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Guards against a native (non-JS) form submission if a user clicks
  // before React has hydrated: without onSubmit attached yet, a <form>
  // with no explicit method defaults to GET on the current URL, which
  // would reload the page and leak the username/code into the query
  // string. Disabling the button until mount makes that window
  // effectively impossible to hit; method="post" below is the fallback
  // in case it ever is (keeps the values out of the URL either way).
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

  async function submit(codeOverride?: string) {
    const otp = codeOverride ?? code;
    if (!username || otp.length !== 6 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code: otp }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Gagal masuk. Coba lagi.");
        setCode("");
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

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <AuthShowcase />

      <main className="flex items-center justify-center bg-canvas-parchment px-6 py-12">
        <div className="w-full max-w-sm">
          <Image
            src="/bankjateng.png"
            alt="Bank Jateng"
            width={1024}
            height={379}
            className="h-8 w-auto"
            priority
          />
          <h1 className="mt-6 text-[30px] font-semibold tracking-tight text-ink">
            Masuk
          </h1>
          <p className="mt-1 text-[14px] text-ink-muted-48">
            Masukkan username dan kode dari aplikasi authenticator Anda.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
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
                <Label htmlFor="code" className="mb-0">
                  Kode Authenticator
                </Label>
                <span className="text-[12px] text-ink-faint">6 digit</span>
              </div>
              <OtpInput
                value={code}
                onChange={setCode}
                autoFocus={false}
                disabled={submitting}
                onComplete={(filled) => submit(filled)}
              />
            </div>

            <FieldError message={error ?? undefined} />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || !mounted}
            >
              {submitting ? <Spinner /> : null}
              {submitting ? "Memverifikasi..." : "Masuk"}
              {!submitting && <ArrowRight />}
            </Button>
          </form>

          <p className="mt-6 border-t border-hairline pt-5 text-center text-[13px] text-ink-muted-48">
            Baru diundang?{" "}
            <Link
              href="/aktivasi"
              className="font-medium text-primary hover:underline"
            >
              Aktivasi akun
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
