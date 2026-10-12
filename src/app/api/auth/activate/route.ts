import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
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

// Deliberately the same message for every failure case (unknown username,
// wrong code, already-consumed code, expired code) — distinguishing them
// would leak which usernames are registered and/or which activation codes
// were once valid. "Sudah pernah dipakai" is mentioned because it's a
// genuinely common, non-adversarial path: a user who saw the QR but
// didn't finish scanning before navigating away lands here on retry, and
// the fix (ask the admin for a new code) is the same regardless of which
// underlying reason applies.
//
// A function, not a shared constant: a Response body can be read only
// once, so one module-level instance answered the first failure correctly
// and every later one with an empty body — which the client then showed
// as its own fallback text instead of this message.
function genericError() {
  return NextResponse.json(
    {
      error:
        "Username atau kode aktivasi tidak valid, sudah pernah dipakai, atau kedaluwarsa. Hubungi admin untuk kode aktivasi baru.",
    },
    { status: 401 }
  );
}

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
    return genericError();
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
    return genericError();
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

  // The code is checked and consumed in one UPDATE rather than compared
  // here and cleared afterwards: with a read-then-write, two requests
  // carrying the same valid code could both pass the check and each walk
  // away with a QR. Now only the request whose UPDATE matches a row wins.
  const secret = generateTotpSecret();
  const consumed = await db
    .update(users)
    .set({
      totpSecretEncrypted: encryptSecret(secret),
      activationCode: null,
      activationCodeExpiresAt: null,
    })
    .where(
      and(
        eq(users.id, user.id),
        eq(users.activationCode, code),
        gt(users.activationCodeExpiresAt, new Date()),
        isNull(users.totpConfirmedAt)
      )
    )
    .returning({ id: users.id });

  if (consumed.length === 0) {
    return genericError();
  }

  const uri = buildTotpUri(secret, username);
  const qrDataUrl = await qrcode.toDataURL(uri);

  return NextResponse.json({
    ok: true,
    qrDataUrl,
    manualKey: secret,
  });
});
