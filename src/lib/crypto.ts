import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encrypt/decrypt for secrets at rest (TOTP secrets only —
 * report content is intentionally left unencrypted at the app level; see
 * README for the reasoning).
 *
 * Output format: "<iv-hex>:<authTag-hex>:<ciphertext-hex>"
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // recommended IV length for GCM

function getKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error("TOTP_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format");
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// Excludes visually ambiguous characters (0/O, 1/I/L) since this is meant
// to be read aloud or typed from a phone screen without transcription
// errors — it's an activation code shared out-of-band (WA/lisan), not a
// high-entropy credential like a session secret.
const ACTIVATION_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const ACTIVATION_CODE_LENGTH = 8;

/** Generates a one-time account activation code (see scripts/seed-user.ts). */
export function generateActivationCode(): string {
  const bytes = randomBytes(ACTIVATION_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < ACTIVATION_CODE_LENGTH; i++) {
    code += ACTIVATION_CODE_CHARSET[bytes[i] % ACTIVATION_CODE_CHARSET.length];
  }
  return code;
}
