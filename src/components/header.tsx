import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

interface HeaderProps {
  username?: string;
  active: "form" | "history";
}

const PILL_BASE =
  "inline-flex items-center justify-center rounded-pill px-4 py-1.5 text-[14px] transition active:scale-95";

/**
 * Shared header bar for authenticated pages (/form, /history). Replaces
 * the ad hoc bare-underlined-link headers that used to be duplicated in
 * each page — this is the one place branding (logo) and primary
 * navigation live.
 */
export function Header({ username, active }: HeaderProps) {
  const otherPage =
    active === "form"
      ? { href: "/history", label: "Riwayat" }
      : { href: "/form", label: "Laporan Baru" };

  return (
    <header className="w-full border-b-2 border-accent-gold bg-primary">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Pre-composited asset (sunburst + white wordmark, transparent
              background) — see scripts/ history for how this was derived
              from the navy-background source logo. Sits directly on the
              header's navy fill, no backing badge needed. */}
          <Image
            src="/bankjateng-header.png"
            alt="Bank Jateng"
            width={2143}
            height={1084}
            className="h-7 w-auto"
            priority
          />
          <span className="hidden text-[14px] font-semibold text-white/90 sm:inline">
            Tele Message Sender
          </span>
        </div>

        <div className="flex items-center gap-2">
          {username && (
            <span
              className={`${PILL_BASE} border border-white/25 bg-white/10 text-white/90`}
            >
              {username}
            </span>
          )}
          <Link
            href={otherPage.href}
            className={`${PILL_BASE} border border-white/40 text-white hover:bg-white/10`}
          >
            {otherPage.label}
          </Link>
          <LogoutButton
            className={`${PILL_BASE} border border-white/40 text-white hover:bg-white/10`}
          />
        </div>
      </div>
    </header>
  );
}
