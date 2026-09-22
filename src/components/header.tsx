import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

interface HeaderProps {
  username?: string;
  active: "form" | "history";
}

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
          {/* The logo's wordmark is navy — needs a light backing on the
              navy header, or it disappears into the background. */}
          <div className="rounded-lg bg-white px-2.5 py-1">
            <Image
              src="/bankjateng.png"
              alt="Bank Jateng"
              width={140}
              height={64}
              className="h-6 w-auto"
              priority
            />
          </div>
          <span className="hidden text-[14px] font-semibold text-white/90 sm:inline">
            Tele Message Sender
          </span>
        </div>

        <div className="flex items-center gap-3">
          {username && (
            <span className="hidden text-[14px] text-white/80 md:inline">
              {username}
            </span>
          )}
          <Link
            href={otherPage.href}
            className="inline-flex items-center justify-center rounded-pill border border-white/40 px-4 py-1.5 text-[14px] text-white transition hover:bg-white/10 active:scale-95"
          >
            {otherPage.label}
          </Link>
          <LogoutButton className="text-white/80 hover:text-white" />
        </div>
      </div>
    </header>
  );
}
