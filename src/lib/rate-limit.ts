import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";

/**
 * Sliding-window rate limit backed by Postgres. Deliberately not in-memory:
 * on Vercel, each request can land on a different serverless instance, and
 * instances get recycled — an in-memory Map would reset constantly and
 * never actually block anything. See README for the reasoning.
 *
 * Usage: checkRateLimit("login:alice", 5, 15 * 60) -> max 5 attempts per 15 min.
 */
export async function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowSeconds: number
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000);

  const rows = await db
    .select({ total: sql<number>`coalesce(sum(${rateLimits.count}), 0)` })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.identifier, identifier),
        gt(rateLimits.windowStart, windowStart)
      )
    );

  const currentCount = Number(rows[0]?.total ?? 0);

  if (currentCount >= maxAttempts) {
    return { allowed: false };
  }

  await db.insert(rateLimits).values({
    identifier,
    windowStart: new Date(),
    count: 1,
  });

  return { allowed: true };
}
