import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { verifyTotpCode } from "@/lib/auth/totp";
import { createSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { withErrorHandling } from "@/lib/api-handler";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  code: z.string().regex(/^\d{6}$/),
});

const DAILY_LOGIN_ATTEMPTS = 20;

// A function, not a shared constant: a Response body can be read only
// once, so one module-level instance answered the first failure correctly
// and every later one with an empty body — which the client then showed
// as its own fallback text instead of this message.
function genericError() {
  return NextResponse.json(
    { error: "Username atau kode tidak valid" },
    { status: 401 }
  );
}

export const POST = withErrorHandling(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return genericError();
  }
  const { username, code } = parsed.data;

  // Rate limit keyed by username (not IP) so one user's lockout doesn't
  // affect others behind the same NAT/office IP, and brute-forcing a known
  // username is still capped regardless of source IP rotation.
  const { allowed } = await checkRateLimit(`login:${username}`, 5, 15 * 60);
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." },
      { status: 429 }
    );
  }

  // The 15-minute limit alone still allows 480 guesses a day. A TOTP code
  // is the only credential here and three codes are valid at any moment
  // (±30s tolerance), so that works out to roughly a 40% chance per year
  // of guessing into one account. The daily cap cuts it to about 2%.
  // Checked second so a request already refused above doesn't spend it.
  // The price is that 20 bad guesses lock the account until the next UTC
  // day — scripts/unlock-user.ts is the way out.
  const daily = await checkRateLimit(
    `login-day:${username}`,
    DAILY_LOGIN_ATTEMPTS,
    24 * 60 * 60
  );
  if (!daily.allowed) {
    console.warn(
      `Daily login cap reached for ${JSON.stringify(username)} — possible code guessing.`
    );
    return NextResponse.json(
      {
        error:
          "Akun dikunci sementara karena terlalu banyak percobaan login hari ini. Hubungi admin.",
      },
      { status: 429 }
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Same generic response whether the username doesn't exist, hasn't
  // finished TOTP setup yet, or the code is wrong — avoids leaking which
  // usernames are registered or their setup state.
  if (!user || user.totpSecretEncrypted === null) {
    return genericError();
  }

  let secret: string;
  try {
    secret = decryptSecret(user.totpSecretEncrypted);
  } catch {
    return genericError();
  }

  const isValid = await verifyTotpCode(username, secret, code);
  if (!isValid) {
    return genericError();
  }

  // First successful login confirms setup permanently. In practice this
  // is already true by the time login succeeds (activation sets the TOTP
  // secret and this check only passes once a correct code verifies
  // against it), but the explicit set keeps the invariant self-evident
  // here rather than only implied by /api/auth/activate's behavior.
  if (user.totpConfirmedAt === null) {
    await db
      .update(users)
      .set({ totpConfirmedAt: new Date() })
      .where(eq(users.username, username));
  }

  await createSession({ id: user.id, username: user.username });
  return NextResponse.json({ ok: true });
});
