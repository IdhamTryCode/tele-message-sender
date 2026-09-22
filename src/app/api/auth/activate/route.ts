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

const activateSchema = z.object({
  username: z.string().trim().min(1).max(50),
  code: z.string().trim().min(1).max(12),
});

const GENERIC_ERROR = NextResponse.json(
  { error: "Username atau kode aktivasi tidak valid" },
  { status: 401 }
);

/**
 * Consumes a one-time activation code (issued by scripts/seed-user.ts or
 * scripts/reissue-activation.ts and shared with the user out-of-band) to
 * generate that user's TOTP secret and return a scannable QR — replacing
 * the old /api/auth/status behavior where merely knowing a registered
 * username was enough to claim its setup. Knowing the username alone no
 * longer does anything here; the activation code is required too.
 */
export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return GENERIC_ERROR;
  }
  const { username, code } = parsed.data;

  const { allowed } = await checkRateLimit(
    `activate:${username}`,
    5,
    15 * 60
  );
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

  if (!user) {
    return GENERIC_ERROR;
  }

  // Deliberate exception to "never reveal account state": someone who's
  // already active landing here gets pointed at /login instead of the
  // same generic error — confirms the username exists and is active (no
  // credential exposed), traded for meaningfully better UX. Documented as
  // an accepted risk in README.
  if (user.totpConfirmedAt !== null) {
    return NextResponse.json(
      { error: "Akun sudah aktif, silakan login." },
      { status: 409 }
    );
  }

  const codeValid =
    user.activationCode !== null &&
    user.activationCode === code &&
    user.activationCodeExpiresAt !== null &&
    user.activationCodeExpiresAt.getTime() > Date.now();

  if (!codeValid) {
    return GENERIC_ERROR;
  }

  const secret = generateTotpSecret();
  await db
    .update(users)
    .set({
      totpSecretEncrypted: encryptSecret(secret),
      // One-time use: clear immediately so this exact code can never be
      // replayed, even if the same (correct) code is submitted again.
      activationCode: null,
      activationCodeExpiresAt: null,
    })
    .where(eq(users.username, username));

  const uri = buildTotpUri(secret, username);
  const qrDataUrl = await qrcode.toDataURL(uri);

  return NextResponse.json({
    ok: true,
    qrDataUrl,
    manualKey: secret,
  });
});
