/**
 * Whitelist of Telegram send targets. The dropdown on the client only ever
 * sees `key`, `label` and `kind` (via GET /api/reports/targets) — the real
 * chat ID lives here, on the server, and is resolved from the target key at
 * submit time. The client can never supply a chat ID directly; this is what
 * stops the app from becoming an open relay to arbitrary Telegram chats.
 *
 * To add a target: add a TG_CHAT_<KEY> env var, then add an entry below.
 * A target whose env var is unset is silently omitted rather than shown
 * as broken — that's what lets this list carry entries that only some
 * deployments configure.
 */

export type TargetKind = "group" | "dm";

export interface TelegramTarget {
  key: string;
  label: string;
  kind: TargetKind;
  chatId: string;
}

function buildTargets(): TelegramTarget[] {
  const entries: Array<{
    key: string;
    label: string;
    kind: TargetKind;
    envVar: string;
  }> = [
    { key: "soc", label: "Tim SOC", kind: "group", envVar: "TG_CHAT_SOC" },
    {
      key: "test-group",
      label: "Test Group",
      kind: "group",
      envVar: "TG_CHAT_TEST_GROUP",
    },
    {
      key: "blue-team",
      label: "Tim Blue Team",
      kind: "group",
      envVar: "TG_CHAT_BLUE_TEAM",
    },
    {
      key: "dm-idham",
      label: "DM Idham",
      kind: "dm",
      envVar: "TG_CHAT_DM_IDHAM",
    },
  ];

  const targets: TelegramTarget[] = [];
  for (const entry of entries) {
    const chatId = process.env[entry.envVar];
    if (chatId) {
      targets.push({
        key: entry.key,
        label: entry.label,
        kind: entry.kind,
        chatId,
      });
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

/** Public-safe view of targets (no chat IDs) for the client picker. */
export function getPublicTargets(): Array<{
  key: string;
  label: string;
  kind: TargetKind;
}> {
  return buildTargets().map(({ key, label, kind }) => ({ key, label, kind }));
}
