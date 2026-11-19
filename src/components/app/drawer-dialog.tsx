"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Right-hand sheet as a native modal <dialog>: the browser supplies the focus
 * trap, Esc/back-gesture dismissal, inert page and top layer, so there is no
 * scrim link, manual focus trap or Esc listener here (Modern Web Guidance:
 * dialog).
 */
export function DrawerDialog({
  titleId,
  kicker,
  title,
  closeHref,
  children,
}: {
  titleId: string;
  kicker: string;
  title: string;
  closeHref: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // `close` does not bubble, so React's onClose never sees it here.
    const leave = () => window.location.assign(closeHref);
    // Esc and backdrop dismissal fire `cancel`; Chromium does not reliably follow
    // with `close`, so navigate from both.
    const onCancel = (event: Event) => {
      event.preventDefault();
      leave();
    };
    el.addEventListener("cancel", onCancel);
    el.addEventListener("close", leave);
    // Dev double-invokes effects; showModal() throws if the dialog is already open.
    if (!el.open) el.showModal();
    return () => {
      el.removeEventListener("cancel", onCancel);
      el.removeEventListener("close", leave);
    };
  }, [closeHref]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby={titleId}
      // Newer than @types/react; without it Esc still closes, only backdrop click is lost.
      {...({ closedby: "any" } as Record<string, string>)}
    >
      <div className="drawer-head">
        <div>
          <p className="drawer-kicker">{kicker}</p>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button type="button" className="btn" onClick={() => ref.current?.close()}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
