import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { ownReports } from "@/lib/reports";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation/report";
import { resolveTargetChatId, getPublicTargets } from "@/lib/targets";
import { validateAndSanitizeImage, InvalidImageError } from "@/lib/image";
import {
  buildReportMessage,
  fitsAsCaption,
  fitsAsMessage,
  sendTelegramMessage,
  sendTelegramPhoto,
  TelegramSendError,
  TELEGRAM_REQUEST_TIMEOUT_MS,
} from "@/lib/telegram";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { withErrorHandling } from "@/lib/api-handler";

// The send loop is sequential and each target can take two Telegram calls
// (photo, then the full text), so the platform limit is set explicitly and
// the loop budgets itself underneath it, leaving room to write the result.
export const maxDuration = 60;
const SEND_BUDGET_MS = 50_000;
const WORST_CASE_TARGET_MS = 2 * TELEGRAM_REQUEST_TIMEOUT_MS;

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(reports)
    .where(ownReports(session))
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

  // Belt-and-suspenders: reportSchema's field limits already keep this
  // under Telegram's 4096-char message cap, but re-check the assembled
  // message itself rather than trusting the field-level math to stay
  // correct forever — this is the actual value sendTelegramMessage will
  // send, so it's the one that must fit.
  if (!fitsAsMessage(message)) {
    return NextResponse.json(
      { error: "Deskripsi dan mitigasi gabungan terlalu panjang untuk dikirim ke Telegram." },
      { status: 400 }
    );
  }

  // The audit row is written BEFORE anything is sent and finalised after.
  // Writing it only at the end meant a failure between the two (a dropped
  // database connection, a timeout) left messages in Telegram with no
  // record of them — and a user who then retried sent everything twice.
  // A row still marked "pending" now means exactly that: a send was
  // started and its outcome was never recorded.
  const [auditRow] = await db
    .insert(reports)
    .values({
      judul,
      tanggal,
      deskripsi,
      mitigasi,
      hasImage: sanitizedImage !== null,
      targetKeys: JSON.stringify(targetKeys),
      submittedBy: session.username,
      status: "pending",
    })
    .returning({ id: reports.id });

  // Sent sequentially (not Promise.all) — keeps Telegram rate-limit
  // behavior predictable and per-target error attribution simple at this
  // scale (2 targets today).
  let successCount = 0;
  let unknownCount = 0;
  const targetErrors: Record<string, string> = {};
  const targetsWithChatIds = targetKeys.map((key, i) => ({
    key,
    chatId: chatIds[i],
  }));

  const startedAt = Date.now();

  for (const { key, chatId } of targetsWithChatIds) {
    // A target is only started if its worst case still fits the budget.
    // Otherwise a slow Telegram would run the function past maxDuration,
    // the platform would kill it mid-loop, and the audit row would never
    // be finalised. A skipped target is a definite "not sent".
    if (Date.now() - startedAt + WORST_CASE_TARGET_MS > SEND_BUDGET_MS) {
      targetErrors[key] =
        "Tidak dikirim karena batas waktu pengiriman habis. Kirim ulang ke target ini saja.";
      continue;
    }

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
        targetErrors[key] = err.translatedMessage;
        if (err.outcomeUnknown) unknownCount++;
        continue;
      }
      throw err;
    }
  }

  // "uncertain" outranks the rest: if even one target may have received
  // the message, the report must not be presented as simply failed.
  const status: "sent" | "failed" | "partial" | "uncertain" =
    unknownCount > 0
      ? "uncertain"
      : successCount === chatIds.length
        ? "sent"
        : successCount === 0
          ? "failed"
          : "partial";

  await db
    .update(reports)
    .set({
      status,
      targetErrors: Object.keys(targetErrors).length
        ? JSON.stringify(targetErrors)
        : null,
    })
    .where(eq(reports.id, auditRow.id));

  if (status === "failed") {
    const detail = Object.values(targetErrors)[0];
    return NextResponse.json(
      {
        error: detail
          ? `Gagal mengirim ke Telegram: ${detail}`
          : "Gagal mengirim ke Telegram. Silakan coba lagi.",
      },
      { status: 502 }
    );
  }

  // An uncertain result is returned as a completed submission (like a
  // partial one), not an error: an error keeps the user on the form with
  // the send button under their cursor, which invites the duplicate.
  if (status === "partial" || status === "uncertain") {
    const targetLabels = Object.fromEntries(
      getPublicTargets().map((t) => [t.key, t.label])
    );
    const detailLines = Object.entries(targetErrors).map(
      ([key, msg]) => `${targetLabels[key] ?? key}: ${msg}`
    );
    const summary =
      status === "uncertain"
        ? `Pengiriman tidak dapat dipastikan. Terkonfirmasi terkirim ke ${successCount} dari ${chatIds.length} target.`
        : `Terkirim ke ${successCount} dari ${chatIds.length} target.`;
    return NextResponse.json({
      ok: true,
      partial: true,
      message: `${summary}\n${detailLines.join("\n")}`,
    });
  }

  return NextResponse.json({ ok: true });
});
