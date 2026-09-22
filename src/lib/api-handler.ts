import { NextResponse } from "next/server";

/**
 * Wraps a route handler so unexpected exceptions (DB connection failures,
 * etc.) never leak stack traces or internal error messages to the client —
 * they're logged server-side and the caller gets a generic 500. Handlers
 * should still return their own specific error responses (401, 400, 429...)
 * for expected failure cases; this is only a safety net for the unexpected.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("Unhandled route error:", err);
      return NextResponse.json(
        { error: "Terjadi kesalahan pada server" },
        { status: 500 }
      );
    }
  };
}
