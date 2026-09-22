import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/validation/report";

export class InvalidImageError extends Error {}

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

  // Re-encoding drops EXIF/ICC/XMP metadata by default (sharp only keeps it
  // when .withMetadata() is explicitly called, which we deliberately don't).
  const sanitized = await sharp(buffer)
    .rotate() // bake in EXIF orientation before it's stripped, so the image doesn't appear sideways
    .toFormat("jpeg", { quality: 90 })
    .toBuffer();

  return { buffer: sanitized, extension: "jpg" };
}
