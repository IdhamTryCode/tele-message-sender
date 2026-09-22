"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/banner";

const NOTICE_KEY = "reportSubmitNotice";

function readAndClearNotice(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(NOTICE_KEY);
    if (stored) sessionStorage.removeItem(NOTICE_KEY);
    return stored;
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — skip the
    // notice, not critical.
    return null;
  }
}

/**
 * Shows the one-time success/partial-failure message set by report-form.tsx
 * right before it redirects here, then clears it — a page refresh or
 * direct visit to /history won't show a stale notice.
 *
 * Read synchronously via useState's lazy initializer rather than an
 * effect: this only ever runs once, on the client (guarded by the
 * `typeof window` check, since the initializer would otherwise also run
 * during SSR), so there's no need for the effect-based "sync with an
 * external system" pattern — it's a plain one-time read on mount.
 */
export function SubmitNotice() {
  const [notice] = useState<string | null>(readAndClearNotice);

  if (!notice) return null;

  const isPartial = notice.toLowerCase().includes("sebagian");
  return (
    <Banner variant={isPartial ? "info" : "success"} className="mb-4">
      {notice}
    </Banner>
  );
}
