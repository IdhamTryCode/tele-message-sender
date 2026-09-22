import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation/report";
import { resolveTargetChatId } from "@/lib/targets";
import { validateAndSanitizeImage, InvalidImageError } from "@/lib/image";
import {
  buildReportMessage,
  fitsAsCaption,
  sendTelegramMessage,
  sendTelegramPhoto,
  TelegramSendError,
} from "@/lib/telegram";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.submittedBy, session.username))
    .orderBy(desc(reports.createdAt))
    .limit(100);

  return NextResponse.json({ reports: rows });
});

export const POST = withErrorHandling(async (request: Request) => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(
    `submit:${session.username}`,
    10,
    60
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi sebentar lagi." },
      { status: 429 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // Client sends target keys as a JSON-stringified array (FormData has no
  // clean native array support paired with fetch); malformed JSON is just
  // another validation failure, not a special case.
  let targetKeysRaw: unknown;
  try {
    targetKeysRaw = JSON.parse(String(formData.get("targetKeys") ?? "[]"));
  } catch {
    return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
  }

  const parsed = reportSchema.safeParse({
    judul: formData.get("judul"),
    tanggal: formData.get("tanggal"),
    deskripsi: formData.get("deskripsi"),
    mitigasi: formData.get("mitigasi"),
    targetKeys: targetKeysRaw,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { judul, tanggal, deskripsi, mitigasi, targetKeys } = parsed.data;

  // Server-side whitelist check — the client only ever sent keys, this is
  // where each one gets resolved to (or rejected as not being) a real chat
  // ID. Fail closed: if ANY key isn't whitelisted, reject the whole
  // request rather than silently sending to a subset.
  const chatIds: string[] = [];
  for (const key of targetKeys) {
    const chatId = resolveTargetChatId(key);
    if (!chatId) {
      return NextResponse.json(
        { error: "Target tidak valid" },
        { status: 400 }
      );
    }
    chatIds.push(chatId);
  }

  const imageFile = formData.get("image");
  let sanitizedImage: { buffer: Buffer; extension: string } | null = null;
  if (imageFile instanceof File && imageFile.size > 0) {
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      sanitizedImage = await validateAndSanitizeImage(
        Buffer.from(arrayBuffer)
      );
    } catch (err) {
      if (err instanceof InvalidImageError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }
  }

  const message = buildReportMessage({
    judul,
    tanggal,
    deskripsi,
    mitigasi,
    submittedBy: session.username,
  });

  // Sent sequentially (not Promise.all) — keeps Telegram rate-limit
  // behavior predictable and per-target error attribution simple at this
  // scale (2 targets today).
  let successCount = 0;
  for (const chatId of chatIds) {
    try {
      if (sanitizedImage) {
        if (fitsAsCaption(message)) {
          await sendTelegramPhoto(
            chatId,
            message,
            sanitizedImage.buffer,
            `report.${sanitizedImage.extension}`
          );
        } else {
          // Caption limit (1024) is shorter than message limit (4096) — if
          // the full report doesn't fit as a caption, send the photo with
          // a short caption and the full text as a follow-up message.
          await sendTelegramPhoto(
            chatId,
            `Laporan: ${judul}\n(lihat pesan berikutnya untuk detail lengkap)`,
            sanitizedImage.buffer,
            `report.${sanitizedImage.extension}`
          );
          await sendTelegramMessage(chatId, message);
        }
      } else {
        await sendTelegramMessage(chatId, message);
      }
      successCount++;
    } catch (err) {
      if (err instanceof TelegramSendError) {
        // Continue to the remaining targets — one failing shouldn't stop
        // delivery to the others.
        continue;
      }
      throw err;
    }
  }

  const status: "sent" | "failed" | "partial" =
    successCount === chatIds.length
      ? "sent"
      : successCount === 0
        ? "failed"
        : "partial";

  await db.insert(reports).values({
    judul,
    tanggal,
    deskripsi,
    mitigasi,
    hasImage: sanitizedImage !== null,
    targetKeys: JSON.stringify(targetKeys),
    submittedBy: session.username,
    status,
  });

  if (status === "failed") {
    return NextResponse.json(
      { error: "Gagal mengirim ke Telegram. Silakan coba lagi." },
      { status: 502 }
    );
  }

  if (status === "partial") {
    return NextResponse.json({
      ok: true,
      partial: true,
      message: `Terkirim ke ${successCount} dari ${chatIds.length} target. Cek riwayat untuk detail.`,
    });
  }

  return NextResponse.json({ ok: true });
});
