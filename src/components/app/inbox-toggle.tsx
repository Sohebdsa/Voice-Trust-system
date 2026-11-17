"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";
import { useInboxCount } from "./inbox-context";

const PANEL_ID = "vt-inbox";

/**
 * Inbox toggle in the top bar. Clicking opens the panel, clicking again closes
 * it; Escape and an outside click dismiss it too, because the panel is a native
 * popover.
 *
 * A click on the button also counts as an outside click, so the browser
 * light-dismisses the panel during the same click. The open state is captured
 * on pointerdown (before that default action) so the second click reliably
 * closes instead of reopening. Keyboard activation falls back to the current
 * DOM state, which is correct because light dismiss does not apply there.
 */
export function InboxToggle() {
  const count = useInboxCount();
  const [open, setOpen] = useState(false);
  const wasOpen = useRef<boolean | null>(null);

  useEffect(() => {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const sync = (event: Event) => setOpen((event as ToggleEvent).newState === "open");
    panel.addEventListener("toggle", sync);
    return () => panel.removeEventListener("toggle", sync);
  }, []);

  function rememberState() {
    const panel = document.getElementById(PANEL_ID);
    wasOpen.current = panel?.matches(":popover-open") ?? false;
  }

  function toggle() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const isOpen = wasOpen.current ?? panel.matches(":popover-open");
    wasOpen.current = null;
    if (isOpen) panel.hidePopover();
    else panel.showPopover();
  }

  return (
    <button
      className="icon-btn inbox-toggle"
      type="button"
      onPointerDown={rememberState}
      onClick={toggle}
      aria-controls={PANEL_ID}
      aria-expanded={open}
      aria-label={count > 0 ? `Inbox, ${count} items need attention` : "Inbox"}
      title="Inbox"
    >
      <Icon name="inbox" size={15} />
      {count > 0 ? (
        <span className="inbox-badge" aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  );
}
