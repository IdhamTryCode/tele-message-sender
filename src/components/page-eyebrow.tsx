/**
 * Small brand label above a page title. The red tick is the one
 * decorative red element on these pages — see the palette note in
 * globals.css for why brand red stays away from buttons and status.
 */
export function PageEyebrow() {
  return (
    <span className="mb-2 flex items-center gap-2">
      <span aria-hidden className="h-[3px] w-4 rounded-full bg-brand-red" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted-48">
        Tele Message Sender
      </span>
    </span>
  );
}
