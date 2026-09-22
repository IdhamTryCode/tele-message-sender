/**
 * Whitelist of Telegram send targets. The dropdown on the client only ever
 * sees `key` and `label` (via GET /api/reports/targets) — the real chat ID
 * lives here, on the server, and is resolved from the target key at submit
 * time. The client can never supply a chat ID directly; this is what stops
 * the app from becoming an open relay to arbitrary Telegram chats.
 *
 * To add a target: add a TG_CHAT_<KEY> env var, then add an entry below.
 */

export interface TelegramTarget {
  key: string;
  label: string;
  chatId: string;
}

function buildTargets(): TelegramTarget[] {
  const entries: Array<{ key: string; label: string; envVar: string }> = [
    { key: "soc", label: "Tim SOC", envVar: "TG_CHAT_SOC" },
    { key: "test-group", label: "Test Group", envVar: "TG_CHAT_TEST_GROUP" },
  ];

  const targets: TelegramTarget[] = [];
  for (const entry of entries) {
    const chatId = process.env[entry.envVar];
    if (chatId) {
      targets.push({ key: entry.key, label: entry.label, chatId });
    }
  }
  return targets;
}

/** Full target list including chat IDs. Server-only — never expose directly. */
export function getTargets(): TelegramTarget[] {
  return buildTargets();
}

/** Look up a target's real chat ID by its public key. Returns undefined if not whitelisted. */
export function resolveTargetChatId(key: string): string | undefined {
  return buildTargets().find((t) => t.key === key)?.chatId;
}

/** Public-safe view of targets (no chat IDs) for the client dropdown. */
export function getPublicTargets(): Array<{ key: string; label: string }> {
  return buildTargets().map(({ key, label }) => ({ key, label }));
}
