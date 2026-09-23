"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { History, LogOut, PenLine, Send } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/form", label: "Laporan Baru", icon: PenLine },
  { href: "/history", label: "Riwayat", icon: History },
] as const;

interface Props {
  username?: string;
  /** Shown as a count next to Riwayat. */
  reportCount?: number;
}

function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return { logout, loggingOut };
}

export function AppSidebar({ username, reportCount }: Props) {
  const pathname = usePathname();
  const { logout, loggingOut } = useLogout();

  const navLinks = NAV.map(({ href, label, icon: Icon }) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] transition-colors",
          active
            ? "bg-primary/[0.06] font-medium text-primary"
            : "text-ink-muted-80 hover:bg-canvas-parchment hover:text-ink"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {href === "/history" && reportCount !== undefined && (
          <span className="tabular text-[12px] text-ink-faint">
            {reportCount}
          </span>
        )}
      </Link>
    );
  });

  return (
    <>
      {/* Desktop: fixed sidebar, so page scroll never moves it. h-dvh with
          its own overflow keeps the user block reachable even on a short
          viewport — the nav scrolls, the user block stays pinned by mt-auto. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-[248px] flex-col overflow-y-auto border-r border-hairline bg-canvas lg:flex">
        <div className="flex flex-col gap-3 border-b border-hairline px-4 py-4">
          <Image
            src="/bankjateng.png"
            alt="Bank Jateng"
            width={1280}
            height={591}
            className="h-6 w-auto self-start"
            priority
          />
          <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Send className="size-3.5 text-accent-gold" />
            Tele Message Sender
          </span>
        </div>

        <nav className="flex flex-col gap-1 p-3">{navLinks}</nav>

        <div className="mt-auto flex items-center gap-2.5 border-t border-hairline p-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-white">
            {username?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">
              {username ?? "—"}
            </span>
            <span className="block text-[11px] text-ink-muted-48">
              Pengirim
            </span>
          </span>
          <button
            onClick={logout}
            disabled={loggingOut}
            aria-label="Keluar"
            title="Keluar"
            className="rounded-lg p-1.5 text-ink-muted-48 transition-colors hover:bg-canvas-parchment hover:text-danger disabled:opacity-50"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Mobile/tablet: sticky top bar with the same links laid out horizontally */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-canvas lg:hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <Send className="size-3.5 text-accent-gold" />
            Tele Message Sender
          </span>
          <button
            onClick={logout}
            disabled={loggingOut}
            aria-label="Keluar"
            className="ml-auto rounded-lg p-1.5 text-ink-muted-48 hover:text-danger disabled:opacity-50"
          >
            <LogOut className="size-4" />
          </button>
        </div>
        <nav className="flex gap-1 px-2 pb-2">{navLinks}</nav>
      </header>
    </>
  );
}
