"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Label, FieldError } from "@/components/ui/card";

interface TotpSetupStepProps {
  username: string;
  qrDataUrl: string;
  manualKey: string;
  /** Called after a successful login-confirmation — typically a redirect. */
  onConfirmed: () => void;
}

/**
 * QR-scan-and-confirm UI shown right after an activation code is
 * accepted. Submitting the first valid code both confirms TOTP setup and
 * logs the user in, via the existing /api/auth/login endpoint — no
 * separate "confirm setup" endpoint needed, since a correct code against
 * a freshly-issued secret only verifies once setup genuinely succeeded.
 */
export function TotpSetupStep({
  username,
  qrDataUrl,
  manualKey,
  onConfirmed,
}: TotpSetupStepProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      onConfirmed();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold text-ink mb-1">
        Setup Authenticator
      </h1>
      <p className="text-[14px] text-ink-muted-48 mb-4">
        Scan kode QR ini dengan Google Authenticator, Authy, atau aplikasi
        TOTP lain, lalu masukkan kode yang muncul untuk menyelesaikan setup.
      </p>
      <div className="flex justify-center mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR code setup authenticator"
          className="rounded-lg border border-hairline"
          width={200}
          height={200}
        />
      </div>
      <p className="text-[12px] text-ink-muted-48 mb-4 break-all">
        Tidak bisa scan? Masukkan kunci ini secara manual:{" "}
        <span className="font-mono text-ink-muted-80">{manualKey}</span>
      </p>
      <form onSubmit={handleSubmit} method="post" className="space-y-4">
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
        <Button type="submit" className="w-full gap-2" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Memverifikasi..." : "Konfirmasi & Masuk"}
        </Button>
      </form>
    </>
  );
}
