import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

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
}

export async function createSession(username: string): Promise<void> {
  const token = await new SignJWT({ username })
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

/** Reads and verifies the session cookie. Returns null if absent/invalid/expired. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    // Invalid signature, malformed token, or expired — all treated as "no session".
    return null;
  }
}
