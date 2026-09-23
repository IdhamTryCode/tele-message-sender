import { Check, Send } from "lucide-react";

/**
 * Left panel on /login and /aktivasi. The sample card is illustrative,
 * not real data — it shows what the product produces before the user has
 * ever signed in, which a bare logo can't.
 */
export function AuthShowcase() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 lg:flex">
      <span className="flex items-center gap-2.5 text-[14px] font-semibold text-white">
        <span className="flex size-7 items-center justify-center rounded-lg bg-accent-gold">
          <Send className="size-3.5 text-primary" />
        </span>
        Tele Message Sender
      </span>

      <div className="max-w-md">
        <h2 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-white">
          Satu laporan, terkirim ke semua tim di Telegram.
        </h2>

        <div
          aria-hidden
          className="mt-8 rounded-lg bg-canvas p-4 shadow-lg shadow-black/20"
        >
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-[13px] font-semibold text-primary">
              Tele Message Sender
            </span>
            <span className="tabular text-[12px] text-ink-faint">17.08</span>
          </div>
          <p className="mt-2 text-[14px] font-medium text-ink">
            Laporan: Aktivitas login mencurigakan
          </p>
          <p className="mt-1.5 text-[13px] text-ink-muted-48">
            Tanggal: 03 Sep 2026
          </p>
          <p className="text-[13px] text-ink-muted-48">
            Target: Tim SOC, Tim Blue Team
          </p>
          <span className="mt-3 flex items-center justify-end gap-1 text-[12px] font-medium text-success">
            <Check className="size-3.5" />
            Terkirim
          </span>
        </div>
      </div>

      <span className="text-[12px] text-white/50">
        Aplikasi internal · Bank Jateng
      </span>
    </div>
  );
}
