import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { formatNumber } from "@/lib/format";
import type { BarRow } from "@/lib/queries/dashboard";

/** Horizontal bars for project coverage, top villages and district/block coverage. */
export function BarList({
  title,
  icon,
  rows,
  href,
  linkLabel = "View all",
  emptyLabel = "No data for the current filters.",
}: {
  title: string;
  icon: IconName;
  rows: BarRow[];
  href?: string;
  linkLabel?: string;
  emptyLabel?: string;
}) {
  const id = `bars-${title.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <section className="card" aria-labelledby={id}>
      <div className="card-head">
        <Icon name={icon} size={14} />
        <span id={id}>{title}</span>
        {href ? (
          <Link className="card-link" href={href}>
            {linkLabel}
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>
          {emptyLabel}
        </p>
      ) : (
        <div className="hbars">
          {rows.map((row) => (
            <div className="hbar" key={row.key}>
              <span className="hbar-label">{row.label}</span>
              <span className="hbar-value num">
                {formatNumber(row.count)}
                {typeof row.share === "number" ? ` · ${row.share}%` : ""}
              </span>
              <span className="hbar-track" aria-hidden="true">
                <span className="hbar-fill" style={{ inlineSize: `${Math.max(row.percent, 2)}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
