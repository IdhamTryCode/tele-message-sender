"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({
  className = "text-[14px] text-ink-muted-48 hover:text-ink hover:underline",
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
      className={["disabled:opacity-50", className].join(" ")}
    >
      {loading ? "Keluar..." : "Keluar"}
    </button>
  );
}
