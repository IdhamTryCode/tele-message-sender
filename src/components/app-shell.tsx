import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

interface Props {
  username?: string;
  reportCount?: number;
  children: ReactNode;
}

/**
 * Sidebar + content column, shared by /form and /history.
 *
 * The sidebar is `position: fixed`, so the content column offsets itself
 * by the sidebar's width rather than sitting next to it in flow.
 * overflow-x-clip (not -hidden) contains any stray wide child without
 * making this element a scroll container — `hidden` would do that, and a
 * scroll container between the viewport and a sticky element silently
 * breaks the stickiness of anything inside (the preview column on /form,
 * the table header on /history).
 */
export function AppShell({ username, reportCount, children }: Props) {
  return (
    <div className="min-h-dvh overflow-x-clip lg:pl-[248px]">
      <AppSidebar username={username} reportCount={reportCount} />
      {children}
    </div>
  );
}
