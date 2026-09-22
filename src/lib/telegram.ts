/**
 * Thin wrapper over the Telegram Bot API. Deliberately dependency-free (just
 * fetch) — sendMessage/sendPhoto is all this app needs, so pulling in a full
 * Telegram SDK would only add unaudited supply-chain surface for no benefit.
 *
 * Messages are sent as plain text (no parse_mode). This is a deliberate
 * choice: Telegram's MarkdownV2 requires escaping ~18 special characters,
 * and HTML mode requires escaping &/</>. Getting that wrong causes Telegram
 * to reject the message (400) or, worse, lets user input break the intended
 * formatting. Plain text sidesteps the entire bug class; this app has no
 * requirement for bold/italic formatting.
 */

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

export class TelegramSendError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "TelegramSendError";
  }
}

async function callTelegramApi(
  method: string,
  body: FormData
): Promise<void> {
  const token = getBotToken();
  const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/${method}`, {
    method: "POST",
    body,
  });

  if (!res.ok) {
    // Don't leak Telegram's raw response body to callers/clients — log it
    // server-side only, and surface a generic error upstream.
    const text = await res.text().catch(() => "");
    console.error(`Telegram API ${method} failed (${res.status}): ${text}`);
    throw new TelegramSendError(
      `Telegram API request failed (${method})`,
      res.status
    );
  }
}

export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<void> {
  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("text", text);
  await callTelegramApi("sendMessage", form);
}

export async function sendTelegramPhoto(
  chatId: string,
  caption: string,
  imageBuffer: Buffer,
  filename: string
): Promise<void> {
  const form = new FormData();
  form.set("chat_id", chatId);
  form.set("caption", caption);
  // Telegram caption limit is 1024 chars; caller is responsible for keeping
  // the caption under that (see buildReportMessage in this module's caller).
  form.set(
    "photo",
    new Blob([new Uint8Array(imageBuffer)]),
    filename
  );
  await callTelegramApi("sendPhoto", form);
}

const TELEGRAM_CAPTION_LIMIT = 1024;
const TELEGRAM_MESSAGE_LIMIT = 4096;

export function buildReportMessage(report: {
  judul: string;
  tanggal: string;
  deskripsi: string;
  mitigasi: string;
  submittedBy: string;
}): string {
  return [
    `Laporan: ${report.judul}`,
    `Tanggal: ${report.tanggal}`,
    `Dikirim oleh: ${report.submittedBy}`,
    "",
    "Deskripsi:",
    report.deskripsi,
    "",
    "Mitigasi:",
    report.mitigasi,
  ].join("\n");
}

/**
 * Telegram captions (used when a photo is attached) are limited to 1024
 * chars, much shorter than the 4096 message limit. If the full report text
 * doesn't fit as a caption, truncate the caption and tell the reader to see
 * the follow-up message — the caller sends the full text as a second
 * sendMessage call in that case.
 */
export function fitsAsCaption(text: string): boolean {
  return text.length <= TELEGRAM_CAPTION_LIMIT;
}

export function fitsAsMessage(text: string): boolean {
  return text.length <= TELEGRAM_MESSAGE_LIMIT;
}
