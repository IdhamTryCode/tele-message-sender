import { TOTP } from "@otplib/totp";
import { NobleCryptoPlugin } from "@otplib/plugin-crypto-noble";
import { ScureBase32Plugin } from "@otplib/plugin-base32-scure";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { totpReplay } from "@/lib/db/schema";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

const ISSUER = "Tele Message Sender";

function makeTotp(secret?: string) {
  return new TOTP({ secret, issuer: ISSUER, crypto, base32 });
}

/** Used by /api/auth/activate when a user's TOTP hasn't been set up yet. */
export function generateTotpSecret(): string {
  return makeTotp().generateSecret();
}

/** Used by /api/auth/activate to build the QR-code setup URI. */
export function buildTotpUri(secret: string, username: string): string {
  return makeTotp(secret).toURI({ label: username, issuer: ISSUER });
}

/**
 * Verifies a 6-digit TOTP code against the user's secret, with:
 * - a ±30s tolerance window (one step each way) for clock drift
 * - replay protection: a given time step can only ever be accepted once,
 *   tracked per-user in the totp_replay table.
 *
 * Returns true only on a genuinely fresh, correct code.
 */
export async function verifyTotpCode(
  username: string,
  secret: string,
  token: string
): Promise<boolean> {
  if (!/^\d{6}$/.test(token)) {
    return false;
  }

  const [replayRow] = await db
    .select()
    .from(totpReplay)
    .where(eq(totpReplay.username, username))
    .limit(1);

  const result = await makeTotp(secret).verify(token, {
    epochTolerance: 30,
    afterTimeStep: replayRow?.lastUsedStep,
  });

  if (!result.valid) {
    return false;
  }

  // Record this time step so the same code (or any code from this or an
  // earlier step) can't be replayed.
  await db
    .insert(totpReplay)
    .values({ username, lastUsedStep: result.timeStep })
    .onConflictDoUpdate({
      target: totpReplay.username,
      set: { lastUsedStep: result.timeStep },
    });

  return true;
}
