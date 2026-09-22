/**
 * Registers a new login user: generates a TOTP secret, prints a QR code to
 * scan with an authenticator app, and stores the secret (encrypted) in the
 * database. There is no admin UI by design — adding a person means running
 * this script once.
 *
 * Usage:
 *   npx tsx scripts/seed-user.ts <username>
 */
import "dotenv/config";
import qrcode from "qrcode";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { generateTotpSecret, buildTotpUri } from "../src/lib/auth/totp";
import { encryptSecret } from "../src/lib/crypto";

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error("Usage: npx tsx scripts/seed-user.ts <username>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (check .env.local)");
    process.exit(1);
  }
  if (!process.env.TOTP_ENCRYPTION_KEY) {
    console.error("TOTP_ENCRYPTION_KEY is not set (check .env.local)");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1);
  if (existing) {
    console.error(`User "${username}" already exists.`);
    process.exit(1);
  }

  const secret = generateTotpSecret();
  const uri = buildTotpUri(secret, username);
  const encrypted = encryptSecret(secret);

  await db.insert(schema.users).values({
    username,
    totpSecretEncrypted: encrypted,
  });

  console.log(`\nUser "${username}" created.\n`);
  console.log("Scan this QR code with Google Authenticator / Authy:\n");
  console.log(await qrcode.toString(uri, { type: "terminal", small: true }));
  console.log(`If you can't scan it, enter this secret manually: ${secret}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
