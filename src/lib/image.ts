import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation/report";

export class InvalidImageError extends Error {}

// Telegram's sendPhoto rejects images whose width+height exceeds 10000px
// or whose aspect ratio exceeds 20:1 (PHOTO_INVALID_DIMENSIONS) — this hit
// in practice with a real upload. Checking metadata before the full
// re-encode also caps how large a pixel buffer sharp will decode into
// memory, which a small but pixel-dense file (e.g. a 40000x40000 PNG)
// could otherwise blow up to gigabytes of uncompressed bitmap and crash
// the serverless function.
const MAX_DIMENSION = 6000;
const MAX_ASPECT_RATIO = 20;

/**
 * Validates an uploaded image and strips EXIF metadata before it ever
 * leaves the server. Two things matter here beyond the obvious size check:
 *
 * 1. We check magic bytes (the file's actual binary signature), not the
 *    `Content-Type`/filename the client sent — both are attacker-controlled
 *    and trivial to spoof (rename evil.exe to evil.jpg).
 * 2. We re-encode via sharp rather than trust the original bytes, which
 *    strips EXIF (GPS coordinates, camera/device info, sometimes embedded
 *    thumbnails) that incident-report screenshots can carry without the
 *    user realizing it.
 *
 * The image is never written to disk — everything happens on the in-memory
 * Buffer, then streamed straight to Telegram by the caller.
 */
export async function validateAndSanitizeImage(
  buffer: Buffer
): Promise<{ buffer: Buffer; extension: string }> {
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new InvalidImageError(
      `Image exceeds maximum size of ${MAX_IMAGE_BYTES} bytes`
    );
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (
    !detected ||
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      detected.mime as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
    )
  ) {
    throw new InvalidImageError(
      "File is not a valid JPEG, PNG, or WebP image"
    );
  }

  // Reading metadata alone (not a full decode) is cheap even for a
  // maliciously crafted file — this is what keeps the pixel-bomb check
  // ahead of the expensive full re-encode below.
  const metadata = await sharp(buffer).metadata();
  const { width, height } = metadata;
  if (!width || !height) {
    throw new InvalidImageError("Could not read image dimensions");
  }
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new InvalidImageError(
      `Image dimensions exceed maximum of ${MAX_DIMENSION}x${MAX_DIMENSION}px`
    );
  }
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  if (aspectRatio > MAX_ASPECT_RATIO) {
    throw new InvalidImageError(
      `Image aspect ratio exceeds maximum of ${MAX_ASPECT_RATIO}:1`
    );
  }

  // Re-encoding drops EXIF/ICC/XMP metadata by default (sharp only keeps it
  // when .withMetadata() is explicitly called, which we deliberately don't).
  const sanitized = await sharp(buffer)
    .rotate() // bake in EXIF orientation before it's stripped, so the image doesn't appear sideways
    .toFormat("jpeg", { quality: 90 })
    .toBuffer();

  return { buffer: sanitized, extension: "jpg" };
}
