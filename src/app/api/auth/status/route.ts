import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import qrcode from "qrcode";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { generateTotpSecret, buildTotpUri } from "@/lib/auth/totp";
import { checkRateLimit } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";

const statusSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

/**
 * First step of login: given a username, tells the client whether TOTP
 * setup is still needed. If it is, this call also generates a fresh
 * secret, persists it immediately (so the same secret is verifiable by the
 * follow-up /api/auth/login call), and returns a scannable QR code.
 *
 * Accepted risk for this app's scale (documented in README): any caller
 * who knows a registered username can trigger/claim its TOTP setup, since
 * there's no separate invite token. This window closes permanently once a
 * user completes setup — totpConfirmedAt becomes non-null (on first
 * successful login) and this endpoint stops regenerating a QR for that
 * username from then on.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ setupRequired: false });
  }
  const { username } = parsed.data;

  // Same rate-limit budget as login — this endpoint also reveals per-username
  // state and (for unset-up users) mutates a credential, so it needs the
  // same brute-force protection.
  const { allowed } = await checkRateLimit(`status:${username}`, 5, 15 * 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." },
      { status: 429 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Unregistered username: don't reveal that — just say no setup is
  // needed, so the client shows the code field and login fails generically.
  if (!user) {
    return NextResponse.json({ setupRequired: false });
  }

  // Only a *confirmed* setup skips straight to code entry. A non-null
  // secret with confirmedAt still null means a QR was issued before but
  // never successfully verified — that still counts as "setup required"
  // so a fresh QR is issued (see regenerate-on-reopen note above).
  if (user.totpConfirmedAt !== null) {
    return NextResponse.json({ setupRequired: false });
  }

  const secret = generateTotpSecret();
  await db
    .update(users)
    .set({ totpSecretEncrypted: encryptSecret(secret) })
    .where(eq(users.username, username));

  const uri = buildTotpUri(secret, username);
  const qrDataUrl = await qrcode.toDataURL(uri);

  return NextResponse.json({
    setupRequired: true,
    qrDataUrl,
    manualKey: secret,
  });
});
