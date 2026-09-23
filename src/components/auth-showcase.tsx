import { Check, Send } from "lucide-react";

/**
 * Left panel on /login and /aktivasi. The sample card is illustrative,
 * not real data — it shows what the product produces before the user has
 * ever signed in, which a bare logo can't.
 *
 * Every row shares one max-w-[480px] column so the brand mark, the
 * headline and the footer line up on the same left edge, with the block
 * as a whole centred in the panel.
 */
export function AuthShowcase() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-navy p-10 lg:flex">
      {/* Two diagonal ribbons sweeping out of the bottom-right corner —
          the logo's swoosh, rebuilt with plain rotated divs. Decorative
          only, so it sits behind the content and is hidden from AT. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -bottom-24 -right-16 h-[10px] w-[560px] rotate-[-35deg] rounded-full bg-brand-red opacity-90" />
        <span className="absolute -bottom-10 -right-20 h-[10px] w-[560px] rotate-[-35deg] rounded-full bg-brand-yellow opacity-90" />
      </div>

      <div className="relative mx-auto w-full max-w-[480px]">
        <span className="flex items-center gap-2.5 text-[14px] font-semibold text-white">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-yellow">
            <Send className="size-3.5 text-brand-navy" />
          </span>
          Tele Message Sender
        </span>
      </div>

      <div className="relative mx-auto w-full max-w-[480px]">
        <h2 className="text-[34px] font-semibold leading-[1.15] tracking-tight text-white">
          Satu laporan, terkirim ke{" "}
          <span className="text-brand-yellow">semua tim</span> di Telegram.
        </h2>

        <div
          aria-hidden
          className="mt-8 rounded-lg bg-canvas p-4 shadow-lg shadow-black/20"
        >
          <div className="flex items-baseline justify-between gap-4">
            {/* Telegram's own sender blue, not the brand navy — this is a
                mock of their UI, so it keeps their colour. */}
            <span className="text-[13px] font-semibold text-[#2f7bbf]">
              Tele Message Sender
            </span>
            <span className="tabular text-[12px] text-ink-faint">17.08</span>
          </div>
          <p className="mt-2 text-[14px] font-medium text-ink">
            Laporan: Aktivitas login mencurigakan
          </p>
          <p className="mt-1.5 text-[13px] text-ink-muted-48">
            Tanggal: 3 Sep 2026
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

      <div className="relative mx-auto w-full max-w-[480px]">
        <span className="text-[12px] text-white/50">
          Aplikasi internal · Bank Jateng
        </span>
      </div>
    </div>
  );
}
