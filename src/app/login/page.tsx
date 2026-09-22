"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, Label, FieldError } from "@/components/ui/card";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
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
        <h1 className="text-[28px] font-semibold text-ink mb-1">Masuk</h1>
        <p className="text-[14px] text-ink-muted-48 mb-6">
          Masukkan username dan kode dari aplikasi authenticator Anda.
        </p>
        <form onSubmit={handleSubmit} method="post" className="space-y-4">
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
            <Label htmlFor="code">Kode Authenticator</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
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
        </form>
        <p className="mt-4 text-center text-[14px] text-ink-muted-48">
          Baru diundang?{" "}
          <Link href="/aktivasi" className="text-primary hover:underline">
            Aktivasi akun
          </Link>
        </p>
      </Card>
    </main>
  );
}
