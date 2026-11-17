import type { ReactNode } from "react";
import { InboxAutoClose } from "./inbox-auto-close";
import { InboxProvider } from "./inbox-context";
import { InboxRail, type InboxItem } from "./inbox-rail";
import { Sidebar } from "./sidebar";
import type { Profile } from "@/lib/data/types";

/**
 * Two-column shell: sidebar and content. The inbox is no longer a permanent
 * third column — it opens from the top-bar icon as a native popover, so it is
 * closed until the user asks for it.
 */
export function AppShell({
  profile,
  inbox,
  children,
  canRegister = true,
}: {
  profile: Profile;
  inbox: InboxItem[];
  children: ReactNode;
  canRegister?: boolean;
}) {
  return (
    <div className="shell">
      <div className="frame">
        <Sidebar profile={profile} />

        <div className="main">
          <InboxProvider count={inbox.length}>{children}</InboxProvider>
        </div>
      </div>

      <InboxAutoClose />
      <div id="vt-inbox" popover="auto" className="inbox-drawer" aria-label="Inbox">
        <InboxRail items={inbox} canRegister={canRegister} />
      </div>
    </div>
  );
}
