/**
 * Regenerates an activation code for an existing, not-yet-confirmed user —
 * for when their original code expired/was lost, or (as with users seeded
 * before the activation-code feature existed) they never had one at all.
 * Refuses for already-confirmed accounts, since those don't need
 * reissuing — see scripts/seed-user.ts for the initial-registration path.
 *
 * Usage:
 *   npx tsx scripts/reissue-activation.ts <username>
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { generateActivationCode } from "../src/lib/crypto";

const ACTIVATION_CODE_VALID_HOURS = 48;

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error("Usage: npx tsx scripts/reissue-activation.ts <username>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (check .env.local)");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  if (!user) {
    console.error(`User "${username}" not found.`);
    process.exit(1);
  }
  if (user.totpConfirmedAt !== null) {
    console.error(
      `User "${username}" is already active (TOTP confirmed) — nothing to reissue.`
    );
    process.exit(1);
  }

  const activationCode = generateActivationCode();
  const activationCodeExpiresAt = new Date(
    Date.now() + ACTIVATION_CODE_VALID_HOURS * 60 * 60 * 1000
  );

  await db
    .update(schema.users)
    .set({ activationCode, activationCodeExpiresAt })
    .where(eq(schema.users.username, username));

  console.log(`\nNew activation code issued for "${username}".`);
  console.log(
    `Kode aktivasi: ${activationCode} (berlaku ${ACTIVATION_CODE_VALID_HOURS} jam)`
  );
  console.log(
    `Beri tahu ${username}: buka /aktivasi, masukkan username "${username}" ` +
      `dan kode ini.\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
