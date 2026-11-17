import Link from "next/link";
import type { ReactNode } from "react";

/** Empty state: explains the situation and offers the next action (PRD §9.6). */
export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{body}</span>
      {actionLabel && actionHref ? (
        <Link className="btn btn-primary" href={actionHref} style={{ marginBlockStart: 4 }}>
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
