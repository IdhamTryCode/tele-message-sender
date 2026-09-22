"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/banner";

const NOTICE_KEY = "reportSubmitNotice";
const VARIANT_KEY = "reportSubmitNoticeVariant";

function readAndClearNotice(): { text: string; variant: "success" | "info" } | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(NOTICE_KEY);
    const variant = sessionStorage.getItem(VARIANT_KEY);
    sessionStorage.removeItem(NOTICE_KEY);
    sessionStorage.removeItem(VARIANT_KEY);
    if (!stored) return null;
    return { text: stored, variant: variant === "info" ? "info" : "success" };
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
  const [notice] = useState(readAndClearNotice);

  if (!notice) return null;

  return (
    <Banner variant={notice.variant} className="mb-4 whitespace-pre-line">
      {notice.text}
    </Banner>
  );
}
