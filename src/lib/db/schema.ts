import {
  bigint,
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

/** Login identities. No passwords — TOTP secret is the only credential. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  // AES-256-GCM encrypted (see src/lib/crypto.ts) — this is a login
  // credential, unlike report content which is left unencrypted at the app
  // level (see README for the reasoning behind that distinction).
  // Nullable: null means the user is registered but hasn't started TOTP
  // setup yet (see src/app/api/auth/status/route.ts). A non-null value
  // here does NOT by itself mean setup is complete — see totpConfirmedAt.
  totpSecretEncrypted: text("totp_secret_encrypted"),
  // Null until the user's first successful login with this secret. Setup
  // status is "not started" (secret null), "pending" (secret set,
  // confirmedAt null — a QR was issued but never successfully scanned+
  // verified), or "confirmed" (both set). Only "not started" and "pending"
  // get a fresh QR from /api/auth/status; "confirmed" always goes straight
  // to code entry.
  totpConfirmedAt: timestamp("totp_confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Audit trail: one row per report submission attempt. */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  judul: varchar("judul", { length: 200 }).notNull(),
  tanggal: date("tanggal").notNull(),
  deskripsi: text("deskripsi").notNull(),
  mitigasi: text("mitigasi").notNull(),
  hasImage: boolean("has_image").notNull().default(false),
  // JSON-stringified array of public target keys (e.g. '["soc","test-group"]')
  // — never raw Telegram chat IDs. One report can go to multiple targets;
  // this is one audit row per submission, not per target (see status below
  // for how partial multi-target failures are represented).
  targetKeys: text("target_keys").notNull(),
  // JSON object mapping failed target keys to a translated (never raw
  // Telegram) error message, e.g. '{"test-group":"Bot tidak terdaftar di
  // chat ini."}'. Null when status is "sent" (nothing failed).
  targetErrors: text("target_errors"),
  // Username from the session, not from client-supplied body — set by the
  // route handler, never trusted from request input.
  submittedBy: varchar("submitted_by", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // "sent" | "failed" | "partial"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Sliding-window rate limit counters, backed by Postgres because Vercel's
 * serverless functions don't share in-memory state between invocations.
 * `identifier` is e.g. "login:alice" or "submit:alice".
 */
export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  identifier: varchar("identifier", { length: 100 }).notNull(),
  windowStart: timestamp("window_start").notNull(),
  count: integer("count").notNull().default(1),
});

/**
 * Prevents a single TOTP code from being accepted twice within its validity
 * window (replay protection). One row per user; lastUsedStep is the Unix
 * time floor-divided by 30 (the TOTP step size).
 */
export const totpReplay = pgTable("totp_replay", {
  username: varchar("username", { length: 50 }).primaryKey(),
  lastUsedStep: bigint("last_used_step", { mode: "number" }).notNull(),
});
