import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Session cookie: a signed (not encrypted) JWT. Signed is sufficient here
 * because the only claim is `username` — nothing secret. HMAC signing means
 * the cookie can't be forged or tampered with client-side even though it's
 * readable; that's the property we need.
 */

const COOKIE_NAME = "session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60; // 8 hours

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  username: string;
  userId: number;
  /**
   * When this user row was created. Reports are keyed by username text, so
   * history queries bound themselves to this to keep a re-created username
   * from inheriting the reports of whoever held the name before.
   */
  userCreatedAt: Date;
}

export async function createSession(user: {
  id: number;
  username: string;
}): Promise<void> {
  const token = await new SignJWT({ username: user.username, uid: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax", not "strict": under strict the browser withholds the cookie
    // on the client-side navigation that follows a successful login, so
    // /form saw an unauthenticated request and proxy.ts bounced the user
    // straight back to /login despite the login having succeeded.
    // Lax still withholds it on cross-site POSTs, which is the CSRF
    // vector that matters here — every state-changing route in this app
    // is a POST.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Reads and verifies the session cookie. Returns null if absent, invalid,
 * expired, or no longer backed by an active user.
 *
 * A valid signature alone is not enough: the token is re-checked against
 * the users table on every call, by row id. Without that, deleting a user
 * left their cookie working for up to 8 hours, and — because the id is
 * what's matched, not the name — a token minted for a deleted user can't
 * come back to life when the same username is registered again.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let username: string;
  let userId: number;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.username !== "string") return null;
    if (typeof payload.uid !== "number") return null;
    username = payload.username;
    userId = payload.uid;
  } catch {
    // Invalid signature, malformed token, or expired — all treated as "no session".
    return null;
  }

  // Outside the try on purpose: a database failure should surface as an
  // error, not be mistaken for "not logged in".
  const [user] = await db
    .select({
      username: users.username,
      totpConfirmedAt: users.totpConfirmedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.username !== username || user.totpConfirmedAt === null) {
    return null;
  }

  return { username, userId, userCreatedAt: user.createdAt };
}
