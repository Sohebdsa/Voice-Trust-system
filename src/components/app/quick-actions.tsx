"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";

const PANEL_ID = "vt-quick-actions";

export type QuickAction = { label: string; href: string; icon: string };

/**
 * Top-bar quick actions. Native popover, so Escape and an outside click
 * dismiss it; the panel grows out of the trigger (see .quick-menu in app.css).
 */
export function QuickActions({ label, items }: { label: string; items: QuickAction[] }) {
  const [open, setOpen] = useState(false);
  const wasOpen = useRef<boolean | null>(null);

  useEffect(() => {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const sync = (event: Event) => setOpen((event as ToggleEvent).newState === "open");
    panel.addEventListener("toggle", sync);
    return () => panel.removeEventListener("toggle", sync);
  }, []);

  // Captured before the click light-dismisses the panel, so a second click closes it.
  function rememberState() {
    wasOpen.current = document.getElementById(PANEL_ID)?.matches(":popover-open") ?? false;
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
    <>
      <button
        className="btn btn-primary"
        type="button"
        onPointerDown={rememberState}
        onClick={toggle}
        aria-controls={PANEL_ID}
        aria-expanded={open}
      >
        <Icon name="plus" size={14} />
        {label}
        <Icon name="chevronDown" size={12} />
      </button>
      <div id={PANEL_ID} popover="auto" className="quick-menu" aria-label={label}>
        {items.map((item) => (
          <Link
            className="quick-menu-item"
            key={item.href}
            href={item.href}
            onClick={() => document.getElementById(PANEL_ID)?.hidePopover()}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </Link>
        ))}
      </div>
    </>
  );
}
