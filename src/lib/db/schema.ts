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
  totpSecretEncrypted: text("totp_secret_encrypted").notNull(),
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
  // Public target key ("soc", "mgmt", ...) — never the raw Telegram chat ID.
  targetKey: varchar("target_key", { length: 50 }).notNull(),
  // Username from the session, not from client-supplied body — set by the
  // route handler, never trusted from request input.
  submittedBy: varchar("submitted_by", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(), // "sent" | "failed"
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
