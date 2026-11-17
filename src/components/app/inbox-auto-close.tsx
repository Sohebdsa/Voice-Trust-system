"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** The inbox is a native popover, so it has to be hidden explicitly on navigation. */
export function InboxAutoClose() {
  const pathname = usePathname();

  useEffect(() => {
    const panel = document.getElementById("vt-inbox");
    if (panel instanceof HTMLElement && panel.matches(":popover-open")) {
      panel.hidePopover();
    }
  }, [pathname]);

  return null;
}
