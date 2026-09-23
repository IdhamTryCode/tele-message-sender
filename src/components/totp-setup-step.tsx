"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Label, FieldError } from "@/components/ui/card";
import { OtpInput } from "@/components/ui/otp-input";

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

  async function submit(codeOverride?: string) {
    const otp = codeOverride ?? code;
    if (otp.length !== 6 || submitting) return;
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
      onConfirmed();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <span className="flex size-10 items-center justify-center rounded-lg bg-primary/[0.06]">
        <QrCode className="size-5 text-primary" />
      </span>
      <h1 className="mt-5 text-[30px] font-semibold tracking-tight text-ink">
        Setup Authenticator
      </h1>
      <p className="mt-1 text-[14px] text-ink-muted-48">
        Scan kode QR ini dengan Google Authenticator, Authy, atau aplikasi TOTP
        lain, lalu masukkan kode yang muncul.
      </p>

      <div className="mt-6 flex justify-center rounded-lg border border-hairline bg-canvas p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt="QR code setup authenticator"
          className="size-44"
          width={176}
          height={176}
        />
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted-48">
        Tidak bisa scan? Masukkan kunci ini manual:{" "}
        <span className="break-all font-mono text-ink-muted-80">
          {manualKey}
        </span>
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        method="post"
        className="mt-6 space-y-5"
      >
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <Label htmlFor="code" className="mb-0">
              Kode Konfirmasi
            </Label>
            <span className="text-[12px] text-ink-faint">6 digit</span>
          </div>
          <OtpInput
            value={code}
            onChange={setCode}
            autoFocus
            disabled={submitting}
            onComplete={(filled) => submit(filled)}
          />
        </div>
        <FieldError message={error ?? undefined} />
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? "Memverifikasi..." : "Konfirmasi & Masuk"}
        </Button>
      </form>
    </>
  );
}
