/**
 * Registers a new username with no TOTP secret yet. There is no admin UI by
 * design — adding a person means running this script once. The user then
 * completes their own TOTP setup (scan QR + confirm) the first time they
 * visit /login — see src/app/api/auth/status/route.ts.
 *
 * Usage:
 *   npx tsx scripts/seed-user.ts <username>
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

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

  await db.insert(schema.users).values({
    username,
    totpSecretEncrypted: null,
  });

  console.log(
    `\nUser "${username}" registered. They can now visit /login, enter ` +
      `"${username}", and complete TOTP setup themselves (a QR code will ` +
      `be shown automatically since no secret is set yet).\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
