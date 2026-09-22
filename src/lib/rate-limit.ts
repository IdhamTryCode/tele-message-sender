import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

/**
 * Fixed-window rate limit backed by Postgres. Deliberately not in-memory:
 * on Vercel, each request can land on a different serverless instance, and
 * instances get recycled — an in-memory Map would reset constantly and
 * never actually block anything. See README for the reasoning.
 *
 * The check-and-increment is a single atomic UPSERT (INSERT ... ON
 * CONFLICT DO UPDATE ... RETURNING), not a SELECT followed by an INSERT.
 * The previous SELECT-then-INSERT version had a TOCTOU race: concurrent
 * requests could all read the same pre-increment count, all see it under
 * the limit, and all insert — letting a burst exceed maxAttempts. The
 * UPSERT closes that gap because Postgres serializes concurrent writers on
 * the same (identifier, windowKey) row.
 *
 * Usage: checkRateLimit("login:alice", 5, 15 * 60) -> max 5 attempts per 15 min.
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  const windowKey = Math.floor(Date.now() / 1000 / windowSeconds);

  const [row] = await db
    .insert(rateLimits)
    .values({ identifier, windowKey, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.identifier, rateLimits.windowKey],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  return { allowed: row.count <= maxAttempts };
}
