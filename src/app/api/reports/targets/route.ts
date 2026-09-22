import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPublicTargets } from "@/lib/targets";
import { withErrorHandling } from "@/lib/api-handler";

/** Returns dropdown options (key + label only) — never chat IDs. */
export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ targets: getPublicTargets() });
});
