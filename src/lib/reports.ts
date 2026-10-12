import { and, eq, gte } from "drizzle-orm";
import type { SessionPayload } from "@/lib/auth/session";
import { reports } from "@/lib/db/schema";

/**
 * The filter for "this user's reports". Reports store the submitter as
 * username text (so the audit trail survives a user being deleted), which
 * on its own means a re-created username inherits the previous holder's
 * history. Bounding by the current user row's creation time closes that.
 */
export function ownReports(session: SessionPayload) {
  return and(
    eq(reports.submittedBy, session.username),
    gte(reports.createdAt, session.userCreatedAt)
  );
}
