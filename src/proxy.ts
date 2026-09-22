import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Route protection for /form and /history. This is a defense-in-depth
 * layer, not the only check — every route handler that touches session
 * data (e.g. POST /api/reports) re-derives the username from its own
 * getSession() call rather than trusting proxy to have already verified
 * it. See Next.js docs: proxy coverage can silently be lost by a matcher
 * change or a route move, so auth must never depend on proxy alone.
 */

const PROTECTED_PATHS = ["/form", "/history"];

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get("session")?.value;
  if (token) {
    try {
      await jwtVerify(token, getSecretKey());
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/form/:path*", "/history/:path*"],
};
