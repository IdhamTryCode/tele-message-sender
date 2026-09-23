import { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

interface Props {
  username?: string;
  reportCount?: number;
  children: ReactNode;
}

/** Sidebar + content column, shared by /form and /history. */
export function AppShell({ username, reportCount, children }: Props) {
  return (
    <div className="flex min-h-dvh">
      <AppSidebar username={username} reportCount={reportCount} />
      {/* pt clears the fixed mobile header; on md+ the sidebar is static
          and the header is gone, so no offset is needed. */}
      <div className="min-w-0 flex-1 overflow-x-hidden pt-[88px] md:pt-0">
        {children}
      </div>
    </div>
  );
}
