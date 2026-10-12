/**
 * Clears the login and activation attempt counters for one username.
 *
 * The login route locks an account for the rest of the (UTC) day after 20
 * attempts — that cap is what keeps TOTP codes from being guessed, but it
 * also means anyone can lock a known username on purpose. This is how an
 * admin lets the real user back in without waiting for the day to roll over.
 *
 * Usage:
 *   npx tsx scripts/unlock-user.ts <username>
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

async function main() {
  const username = process.argv[2]?.trim();
  if (!username) {
    console.error("Usage: npx tsx scripts/unlock-user.ts <username>");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (check .env.local)");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  const cleared = await db
    .delete(schema.rateLimits)
    .where(
      inArray(schema.rateLimits.identifier, [
        `login:${username}`,
        `login-day:${username}`,
        `activate:${username}`,
      ])
    )
    .returning({ identifier: schema.rateLimits.identifier });

  console.log(
    cleared.length
      ? `\nCleared ${cleared.length} attempt counter(s) for "${username}".\n`
      : `\nNo attempt counters found for "${username}" — nothing to clear.\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
