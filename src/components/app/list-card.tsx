import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";

export type ListRow = {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  meta: string;
  icon: IconName;
};

/** Rows with a round icon, title/subtitle, right-aligned value and relative time. */
export function ListCard({
  title,
  icon = "activity",
  viewAllHref,
  rows,
  empty,
}: {
  title: string;
  icon?: IconName;
  viewAllHref?: string;
  rows: ListRow[];
  empty?: ReactNode;
}) {
  return (
    <section className="card" aria-labelledby={`list-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <div className="card-head">
        <Icon name={icon} size={14} />
        <span id={`list-${title.replace(/\s+/g, "-").toLowerCase()}`}>{title}</span>
        {viewAllHref ? (
          <Link className="card-link" href={viewAllHref}>
            View all
          </Link>
        ) : null}
      </div>
      {rows.length === 0 && empty ? empty : (
        <div className="rows">
          {rows.map((row) => (
            <div className="row" key={row.id}>
              <span className="row-icon">
                <Icon name={row.icon} size={15} />
              </span>
              <span className="row-main">
                <span className="row-title">{row.title}</span>
                <span className="row-sub">{row.subtitle}</span>
              </span>
              <span className="row-aside">
                <span className="row-value">{row.value}</span>
                <br />
                <span className="row-time">{row.meta}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
