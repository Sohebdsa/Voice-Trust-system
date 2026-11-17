import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import type { DashboardData } from "@/lib/queries/dashboard";

export type InboxItem = DashboardData["inbox"][number];

/** Right rail: action items that need a decision, with quick-add pinned at the bottom. */
export function InboxRail({
  items,
  canRegister,
}: {
  items: InboxItem[];
  canRegister: boolean;
}) {
  return (
    <aside className="rail" aria-labelledby="inbox-title">
      <div className="rail-head">
        <Icon name="inbox" size={15} />
        <span id="inbox-title">Inbox</span>
        <span className="rail-count">{items.length}</span>
      </div>

      <div className="rail-body">
        {items.length === 0 ? (
          <div className="empty" style={{ background: "var(--paper)" }}>
            <strong>Nothing waiting.</strong>
            <span>Leave approvals, possible duplicates and overdue indicator entries appear here.</span>
          </div>
        ) : (
          items.map((item) => (
            <Link key={item.key} className="inbox-card" href={item.href}>
              <span className="inbox-top">
                <span className="inbox-icon">
                  <Icon name={item.icon} size={14} />
                </span>
                <span className="inbox-title">{item.title}</span>
              </span>
              <span className="inbox-detail">{item.detail}</span>
              <span className="inbox-action">Review</span>
            </Link>
          ))
        )}
      </div>

      <div className="rail-actions">
        {canRegister ? (
          <Link className="btn btn-primary btn-block" href="/beneficiaries/new">
            <Icon name="plus" size={14} /> Add beneficiary
          </Link>
        ) : null}
        <Link className="btn btn-block" href="/activities/new">
          <Icon name="plus" size={14} /> Log activity
        </Link>
      </div>
    </aside>
  );
}
