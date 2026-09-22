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

  const parsed = reportSchema.safeParse({
    judul: formData.get("judul"),
    tanggal: formData.get("tanggal"),
    deskripsi: formData.get("deskripsi"),
    mitigasi: formData.get("mitigasi"),
    targetKey: formData.get("targetKey"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Input tidak valid", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { judul, tanggal, deskripsi, mitigasi, targetKey } = parsed.data;

  // Server-side whitelist check — the client only ever sent a key, this is
  // where it gets resolved to (or rejected as not being) a real chat ID.
  const chatId = resolveTargetChatId(targetKey);
  if (!chatId) {
    return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
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

  let status: "sent" | "failed" = "sent";
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
        // Caption limit (1024) is shorter than message limit (4096) — if the
        // full report doesn't fit as a caption, send the photo with a short
        // caption and the full text as a follow-up message.
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
  } catch (err) {
    if (err instanceof TelegramSendError) {
      status = "failed";
    } else {
      throw err;
    }
  }

  await db.insert(reports).values({
    judul,
    tanggal,
    deskripsi,
    mitigasi,
    hasImage: sanitizedImage !== null,
    targetKey,
    submittedBy: session.username,
    status,
  });

  if (status === "failed") {
    return NextResponse.json(
      { error: "Gagal mengirim ke Telegram. Silakan coba lagi." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
});
