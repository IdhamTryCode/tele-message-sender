"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({
  className = "text-ink-muted-48 hover:text-ink",
}: {
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={[
        "text-[14px] hover:underline disabled:opacity-50",
        className,
      ].join(" ")}
    >
      {loading ? "Keluar..." : "Keluar"}
    </button>
  );
}
